const $ = (id) => document.getElementById(id);
const form = $('analysis-form');
const fmt = (n) => Number.isFinite(n) ? new Intl.NumberFormat('ko-KR').format(Math.round(n)) : '미연결';
const money = (n) => Number.isFinite(n) ? `${fmt(n)}원` : '데이터 부족';
let current;

async function geocode(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=kr&q=${encodeURIComponent(address)}`;
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`주소 좌표 변환 실패 (${r.status})`);
  const rows = await r.json();
  if (!rows[0]) throw new Error('주소를 찾지 못했습니다. 도로명 주소를 확인하세요.');
  return { lat: Number(rows[0].lat), lon: Number(rows[0].lon), label: rows[0].display_name };
}
async function overpass(lat, lon) {
  const query = `[out:json][timeout:25];(nwr(around:3000,${lat},${lon})[amenity=car_wash];nwr(around:3000,${lat},${lon})[amenity=parking];nwr(around:3000,${lat},${lon})[building=apartments];);out center tags;`;
  const r = await fetch('https://overpass-api.de/api/interpreter', { method:'POST', body:query, headers:{'Content-Type':'text/plain'} });
  if (!r.ok) throw new Error(`공공 POI 조회 실패 (${r.status})`);
  return (await r.json()).elements || [];
}
function distance(a,b,c,d){const p=Math.PI/180;const x=(c-a)*p*Math.cos((b+d)/2*p),y=(d-b)*p;return Math.sqrt(x*x+y*y)*6371}
function makeAnalysis(geo, elements) {
  const washes=elements.filter(e=>e.tags?.amenity==='car_wash').map(e=>({name:e.tags.name||'이름 없는 세차장', address:e.tags['addr:street']||e.tags['addr:full']||'주소 미제공', distance:distance(geo.lat,geo.lon,e.lat??e.center?.lat,e.lon??e.center?.lon)})).sort((a,b)=>a.distance-b.distance);
  const parking=elements.filter(e=>e.tags?.amenity==='parking').length;
  const apartments=elements.filter(e=>e.tags?.building==='apartments').length;
  return { geo,washes,parking,apartments, publicUnavailable:['인구·가구·자동차 등록통계: 정부 API 인증 설정 필요','K-APT 주차대수: 단지 API 연결 필요','동별 손세차 기준단가: AFJ DB 조사자료 필요','월세: 사용자가 입력하지 않아 계산하지 않음'] };
}
function render(a){
  current=a; $('result-address').textContent=$('address').value; $('coords').textContent=`${a.geo.lat.toFixed(5)}, ${a.geo.lon.toFixed(5)}`; $('source-status').textContent=`실제 OSM 조회 · ${a.washes.length}곳 세차장`;
  $('grade').textContent='—'; $('recommendation').textContent='데이터 연결 후 등급 산출'; $('revenue').textContent='데이터 부족'; $('profit').textContent='데이터 부족'; $('profit-note').textContent='단가·수요·월세 데이터가 필요합니다';
  const cards=[['자가용','미연결','자동차 등록통계'],['35~50세 남성','미연결','인구 API 필요'],['가족가구','미연결','가구 API 필요'],['1인가구','미연결','가구 API 필요'],['공동주택',fmt(a.apartments)+'개','OSM 건물 태그'],['주차환경',fmt(a.parking)+'곳','OSM 주차 POI'],['손세차 단가','미연결','AFJ DB 필요'],['월세',$('rent').value?`${fmt(Number($('rent').value))}원`:'미입력','사용자 입력']];
  $('data-grid').innerHTML=cards.map(c=>`<article><small>${c[0]}</small><strong>${c[1]}</strong><span>${c[2]}</span></article>`).join('');
  $('good').innerHTML=[a.apartments?`반경 3km 안에 공동주택 건물 ${fmt(a.apartments)}개가 확인됩니다.`:'공동주택 POI가 확인되지 않았습니다.',a.parking?`주차 POI ${fmt(a.parking)}곳이 확인됩니다.`:'주차 POI가 확인되지 않았습니다.',a.washes.length===0?'OSM 기준 세차장 POI가 확인되지 않아 경쟁 공백일 수 있습니다.':`주변 세차장 ${a.washes.length}곳을 확인했습니다.`].map(x=>`<li>${x}</li>`).join('');
  $('warn').innerHTML=a.publicUnavailable.map(x=>`<li>${x}</li>`).join('');
  $('wash-list').innerHTML=a.washes.length?a.washes.map(w=>`<div class="wash-row"><strong>${w.name}</strong><span>${w.address}</span><span>${w.distance.toFixed(1)}km</span></div>`).join(''):'<div class="wash-row"><span>조회된 세차장 POI가 없습니다.</span></div>';
  renderSaved();
}
function renderSaved(){const rows=JSON.parse(localStorage.getItem('sonsechaCandidates')||'[]');$('saved-list').innerHTML=rows.length?`<table><thead><tr><th>주소</th><th>등급</th><th>세차장</th><th>월세</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.address}</td><td>${r.grade}</td><td>${r.washes}곳</td><td>${r.rent}</td></tr>`).join('')}</tbody></table>`:'<span class="muted">저장된 후보지가 없습니다.</span>'}
form.addEventListener('submit',async(e)=>{e.preventDefault();$('error').classList.add('hidden');$('input-view').classList.add('hidden');$('loading').classList.remove('hidden');try{const geo=await geocode($('address').value);let elements=[];try{elements=await overpass(geo.lat,geo.lon)}catch(err){$('error').textContent=err.message;$('error').classList.remove('hidden')}render(makeAnalysis(geo,elements));$('loading').classList.add('hidden');$('results').classList.remove('hidden')}catch(err){$('loading').classList.add('hidden');$('input-view').classList.remove('hidden');$('error').textContent=err.message;$('error').classList.remove('hidden')}});
$('save').addEventListener('click',()=>{if(!current)return;const rows=JSON.parse(localStorage.getItem('sonsechaCandidates')||'[]');if(rows.length>=3){$('error').textContent='후보지는 최대 3개까지 저장할 수 있습니다.';$('error').classList.remove('hidden');return}rows.push({address:$('address').value,grade:$('grade').textContent,washes:current.washes.length,rent:$('rent').value?money(Number($('rent').value)):'미입력'});localStorage.setItem('sonsechaCandidates',JSON.stringify(rows));renderSaved()});
$('back').addEventListener('click',()=>{ $('results').classList.add('hidden');$('input-view').classList.remove('hidden');window.scrollTo({top:0,behavior:'smooth'})});

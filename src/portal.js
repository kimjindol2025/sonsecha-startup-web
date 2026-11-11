const search = document.querySelector('#guideSearch');
const cards = [...document.querySelectorAll('[data-guide-card]')];
let category = 'all'; let stage = 'all';
const stageLabels = {all:'전체 단계',explore:'알아보는 중',site:'후보지 검토 중',contract:'계약 준비 중',build:'공사 준비 중',operate:'운영 중'};
function render() {
 let count=0;
 const query=search.value.trim().toLocaleLowerCase();
 for(const card of cards){const show=(category==='all'||card.dataset.category===category)&&(stage==='all'||card.dataset.stage===stage)&&card.textContent.toLocaleLowerCase().includes(query);card.hidden=!show;if(show)count++;}
 document.querySelector('#resultCount').textContent=`${stageLabels[stage]} · 가이드 ${count}편`;
 document.querySelector('#emptyResults').hidden=count!==0;
 document.querySelector('#stageContext').textContent=stage==='all'?'지금 필요한 정보부터, 하나씩 확인하세요.':`${stageLabels[stage]}에 읽으면 좋은 가이드입니다.`;
}
document.querySelectorAll('button[data-category]').forEach(button=>button.addEventListener('click',()=>{category=button.dataset.category;document.querySelectorAll('button[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));render();}));
document.querySelectorAll('button[data-stage]').forEach(button=>button.addEventListener('click',()=>{stage=button.dataset.stage;document.querySelectorAll('button[data-stage]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));render();document.querySelector('#library').scrollIntoView({behavior:'instant'});}));
search.addEventListener('input',render);
document.querySelector('[data-reset-filters]').addEventListener('click',()=>{search.value='';category='all';stage='all';document.querySelectorAll('button[data-category],button[data-stage]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.category??b.dataset.stage)==='all')));render();search.focus();});
// Keep old bookmarks on the same origin and retain all existing browser storage.
const legacyHashes=['#plan','#shop','#roadmap','#documents','#field-guide','#risk','#contract-check','#candidate-record'];
function legacyRoute(){if(legacyHashes.some(hash=>location.hash===hash||location.hash.startsWith(hash+'/')))location.replace(`./guide.html${location.hash}`);}
legacyRoute();window.addEventListener('hashchange',legacyRoute);render();

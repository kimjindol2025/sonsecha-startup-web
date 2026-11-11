(() => {
 const form=document.querySelector('#consultDraft');if(!form)return;
 const q=new URLSearchParams(location.search);const types={self:'셀프세차',hand:'손세차',mixed:'복합',unknown:'미정'};
 if(q.get('type') in types)form.elements.type.value=types[q.get('type')];
 const scope={all:'전체 진행',construction:'토목·건축',equipment:'장비 제조·납품',install:'설치·교체',opening:'오픈 준비'};
 if(q.get('scope') in scope)form.elements.scope.value=scope[q.get('scope')];
 const output=document.querySelector('#consultSummary');const status=document.querySelector('#consultStatus');
 function update(){const d=new FormData(form);output.textContent=['빅워시 창업·시공 상담 준비','세차 방식: '+d.get('type'),'요청 범위: '+d.get('scope'),'현재 단계: '+d.get('stage'),'지역: '+(d.get('region')||'미정'),'예상 규모: '+(d.get('size')||'미정'),'희망 일정: '+(d.get('schedule')||'미정'),'요청사항: '+(d.get('memo')||'없음')].join('\n');status.textContent='';}
 form.addEventListener('input',update);form.addEventListener('change',update);form.addEventListener('submit',e=>e.preventDefault());
 document.querySelector('#copyConsult').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(output.textContent);status.textContent='상담 요약을 복사했습니다. 운영 사이트에서 직접 붙여넣어 전달하세요. 아직 접수된 내용은 없습니다.';}catch{status.textContent='자동 복사가 불가능합니다. 아래 상담 요약을 직접 선택해 복사하세요.';}});update();
})();

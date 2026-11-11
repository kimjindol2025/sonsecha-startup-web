(() => {
 const header=document.querySelector('.business-header');if(!header||header.dataset.ready)return;header.dataset.ready='true';
 const button=header.querySelector('.business-menu-toggle');const nav=header.querySelector('.business-nav');const more=header.querySelector('details');
 const close=()=>{button.setAttribute('aria-expanded','false');nav.classList.remove('is-open');more.open=false;};
 button.addEventListener('click',()=>{const open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));nav.classList.toggle('is-open',open);});
 nav.addEventListener('click',event=>{if(event.target.closest('a'))close();});
 document.addEventListener('click',event=>{if(!header.contains(event.target))close();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&(more.open||nav.classList.contains('is-open'))){close();button.focus();}});
 const page=document.querySelector('[data-service-checklist]');
 if(page){const key='bigwash-service-checks-v1:'+page.dataset.serviceChecklist;let saved=[];try{saved=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(saved))saved=[];}catch{}
 const boxes=[...page.querySelectorAll('input[type=checkbox]')];const update=()=>{page.querySelector('[data-check-progress]').textContent=boxes.filter(b=>b.checked).length+' / '+boxes.length+' 준비 확인';};
 boxes.forEach(box=>{box.checked=saved.includes(box.value);box.addEventListener('change',()=>{try{localStorage.setItem(key,JSON.stringify(boxes.filter(b=>b.checked).map(b=>b.value)));}catch{page.querySelector('[data-check-note]').textContent='브라우저 저장이 불가능합니다. 필요한 내용은 별도로 기록하세요.';}update();});});update();}
})();

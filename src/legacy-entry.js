// Static hosting has no submission API. Preserve browser-local planning, never claim a request was saved.
if (location.hostname.endsWith('.github.io')) {
  const banner=document.createElement('aside');banner.setAttribute('role','note');banner.style.cssText='padding:14px 24px;background:#e8f0ff;color:#163b77;font:14px/1.6 sans-serif;position:relative;z-index:5';
  banner.innerHTML='<strong>브라우저에 저장하는 창업 준비 도구입니다.</strong> GitHub Pages에서는 상담 접수를 받지 않습니다. <a href="https://sonsecha.dclub.kr/" style="text-decoration:underline">운영 사이트에서 상담하기 ↗</a> · 작성 자료는 자동 전달되지 않습니다. <a href="./index.html">새 메인으로</a>';
  document.querySelector('.site-header').after(banner);
  document.addEventListener('click',event=>{if(event.target.closest('[data-consultation-request],[data-consultation-create],#feedbackOpenButton')){event.preventDefault();event.stopImmediatePropagation();window.location.href='https://sonsecha.dclub.kr/';}},true);
  const prefix=import.meta.env.BASE_URL;
  const fix=()=>{document.querySelectorAll('a[href^="/"],img[src^="/product-images/"]').forEach(el=>{const attr=el.tagName==='IMG'?'src':'href';const value=el.getAttribute(attr);if(value&&!value.startsWith('//')&&!value.startsWith(prefix))el.setAttribute(attr,prefix+value.slice(1));});};
  fix();new MutationObserver(fix).observe(document.querySelector('main'),{childList:true,subtree:true});
}

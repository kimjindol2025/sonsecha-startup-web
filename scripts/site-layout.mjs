export const primary = [
 ['셀프세차 창업','self-carwash.html'],['손세차 창업','hand-carwash.html'],
 ['토목·건축','construction.html'],['장비 제조·설치','equipment-service.html'],
 ['시공 사례','projects.html'],['제품몰','guide.html#shop']
];
export const secondary = [['창업 가이드','index.html#library'],['사업계획서','guide.html#plan'],['후보지 기록','guide.html#candidate-record'],['실무 체크리스트','guide.html#field-guide'],['노터치 리서치','korea-touchless-report.html'],['회사 소개','about.html'],['운영 앱','operations-apps.html']];
export function navigation(p='./',current=''){
 const link=([label,url])=>`<a href="${p}${url}"${current===url?' aria-current="page"':''}>${label}</a>`;
 return `<header class="business-header"><div class="business-header-inner"><a class="business-brand" href="${p}index.html" aria-label="빅워시 메인페이지"><span class="business-mark">BW</span><span>BIGWASH<small>세차장 창업 · 토목부터 오픈까지</small></span></a><button class="business-menu-toggle" type="button" aria-expanded="false" aria-controls="businessNav">메뉴 ☰</button><nav class="business-nav" id="businessNav" aria-label="주요 메뉴">${primary.map(link).join('')}<details class="business-more"><summary>더보기</summary><div>${secondary.map(link).join('')}</div></details><a class="business-contact" href="${p}consult.html">창업·시공 상담 ↗</a></nav></div></header><script defer src="${p}site-nav.js"></script>`;
}
export function footer(p='./'){
 return `<footer class="business-footer"><div class="business-shell"><div class="business-footer-top"><a class="business-brand" href="${p}index.html"><span class="business-mark">BW</span><span>BIGWASH<small>토목 · 건축 · 장비 제조 · 설치 · 오픈</small></span></a><a class="business-phone" href="tel:03116887759">상담 031-1688-7759 ↗</a></div><nav aria-label="하단 메뉴">${[...primary,...secondary].map(([t,u])=>`<a href="${p}${u}">${t}</a>`).join('')}<a href="https://sonsecha.dclub.kr/privacy">개인정보 안내 ↗</a></nav><p>BIGWASH는 대한이엔지가 운영하는 서비스 브랜드입니다.<br>대표 김진돌 · 사업자등록번호 127-38-49368 · 통신판매업신고 2008-경기양주-0178<br>경기도 양주시 감악산로 244번길 117번지</p><small>© BIGWASH. 현장에 맞는 세차장을 함께 만듭니다.</small></div></footer>`;
}

import './blog.css';
import './blog-extra.css';
import { blogPosts } from './blog-posts-promo.js';
import { realEstatePosts } from './blog-posts-realestate.js';
import { wastewaterPosts } from './blog-posts-wastewater.js';
import { operationsPosts } from './blog-posts-operations.js';
import { practicalGuidance } from './blog-practical.js';
import { documentDetails } from './blog-document-details.js';
import { wastewaterLongform } from './blog-wastewater-longform.js';
import wastewaterSource from './blog-wastewater-source.md?raw';
import operationsSource from './blog-operations-source.md?raw';
import realEstateSource from './blog-realestate-source.md?raw';
import addressFacilitySource from './blog-address-facility-source.md?raw';
import facilityGroupUseChangeSource from './blog-facility-group-use-change-source.md?raw';
import violationBuildingSource from './blog-violation-building-source.md?raw';
import handwashWastewaterSource from './blog-handwash-wastewater-source.md?raw';
import handwashWastewaterPermitSource from './blog-handwash-wastewater-permit-source.md?raw';
import carwashPipeConnectionSource from './blog-carwash-pipe-connection-source.md?raw';
import publicSewerApprovalSource from './blog-public-sewer-approval-source.md?raw';
import drivewaySidewalkPermitSource from './blog-driveway-sidewalk-permit-source.md?raw';
import waterElectricitySource from './blog-water-electricity-source.md?raw';

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const articlePath = (slug) => `/blog/${encodeURIComponent(slug)}`;
const addressFacilityPost = { slug: 'address-facility-permission', category: '부동산·건축 09', title: '이 주소에서 자동차 관련 시설인 세차장이 허용됩니까?', description: '주소만 던지고 답을 기다리지 않도록 건축물대장·토지이용계획·현장 조건과 기관 질문을 정리합니다.', intro: '', sections: [], site: '후보지별 서류 발급일과 기관 답변을 기록하고, 미확인 항목을 상담 질문으로 정리할 수 있습니다.', next: '이 주소의 조건을 후보지 기록에 남기고 관할 기관에 구체적으로 문의하세요.', link: '/permit' };
const facilityGroupUseChangePost = { slug: 'facility-group-use-change', category: '부동산·건축 10', title: '세차장 용도변경, 시설군 번호만으로 끝나지 않는 이유', description: '세차장 분류와 시설군 이동 방향에 따른 허가·신고 검토 순서를 정리합니다.', intro: '', sections: [], site: '허가 확인 페이지에서 현재 시설군과 변경 조건, 기관 확인 기록을 정리하고 필요한 상담 범위를 선택할 수 있습니다.', next: '현재 건축물대장 용도와 시설군을 확인한 뒤 관할 건축과에 문의하세요.', link: '/permit' };
const violationBuildingPost = { slug: 'violation-building-check', category: '부동산·건축 11', title: '위반건축물·불법증축 확인 방법과 세차장 용도변경 영향', description: '건축물대장·도면·현장·관할 건축과 확인을 연결해 후보지 위험을 기록하는 방법입니다.', intro: '', sections: [], site: '허가 확인 페이지에서 위반건축물 표시 여부와 확인일·근거 메모를 후보지별로 기록하고, 필요한 내용을 관리자 상담으로 전달할 수 있습니다.', next: '건축물대장과 현황도를 준비해 실제 공간과 비교하세요.', link: '/permit' };
const handwashWastewaterPost = { slug: 'handwash-wastewater-facility', category: '폐수시설 12', title: '손세차시설, 폐수배출시설에 해당할까요?', description: '세차시설 분류와 폐수량·처리 경로를 기준으로 허가·신고 여부를 확인하는 방법입니다.', intro: '', sections: [], site: '허가 확인 페이지에서 세차 방식·폐수량·약품·처리 경로와 기관 확인 기록을 저장하고, 필요한 설계·인허가 상담으로 연결할 수 있습니다.', next: '세차 방식과 일 최대 폐수량, 배출 경로를 먼저 정리하세요.', link: '/permit' };
const handwashWastewaterPermitPost = { slug: 'handwash-wastewater-permit', category: '폐수시설 13', title: '손세차장 폐수배출시설, 설치허가와 설치신고를 어떻게 구분할까', description: '50㎥ 기준의 의미와 허가·신고 판단에 필요한 지역·성분·처리 경로를 정리합니다.', intro: '', sections: [], site: '허가 확인 페이지에서 폐수량·약품·설치지역·처리 경로와 기관 확인 상태를 기록하고 필요한 상담 범위를 선택할 수 있습니다.', next: '50㎥만 보지 말고 특정수질유해물질과 설치지역 조건을 함께 확인하세요.', link: '/permit' };
const carwashPipeConnectionPost = { slug: 'carwash-pipe-connection', category: '폐수시설 14', title: '세차폐수, 어느 관로에 연결해야 할까?', description: '오수·우수·합류식 하수도 구분과 세차장 배수설비 확인 절차를 정리합니다.', intro: '', sections: [], site: '허가 확인 페이지에서 오수·우수관 위치, 처리 경로와 하수도 부서 확인 기록을 후보지별로 저장할 수 있습니다.', next: '현장 도면과 관로 위치를 준비해 관할 하수도 부서에 문의하세요.', link: '/permit' };
const publicSewerApprovalPost = { slug: 'public-sewer-approval', category: '폐수시설 15', title: '공공하수도 유입, 별도 승인이 필요할까?', description: '폐수배출시설 신고와 배수설비 설치·사용시작 절차를 구분해 확인하는 방법입니다.', intro: '', sections: [], site: '허가 확인 페이지에서 공공하수도 처리구역, 배수설비 신고와 사용시작 확인 상태를 후보지별로 기록할 수 있습니다.', next: '공공하수도관리청에 연결 지점과 배수설비 절차를 문의하세요.', link: '/permit' };
const drivewaySidewalkPermitPost = { slug: 'driveway-sidewalk-permit', category: '부동산·건축 12', title: '차량 출입구와 보도 공사, 허가가 필요할까?', description: '도로점용·도로공사·도로연결 허가와 세차장 진입로 확인 순서를 정리합니다.', intro: '', sections: [], site: '허가 확인 페이지에서 차량 진입로·보도 턱·도로점용 필요 여부와 기관 확인 기록을 후보지별로 저장할 수 있습니다.', next: '현장 사진과 진입 계획을 준비해 관할 도로관리청에 문의하세요.', link: '/permit' };
const waterElectricityPost = { slug: 'water-electricity-supply', category: '현장 확인 01', title: '세차장 수도·전기 공급, 신청 전에 용량부터 확인하세요', description: '수도 공급과 전기 증설을 신청하기 전에 계량기·용량·장비·공사 일정을 확인하는 순서를 정리합니다.', intro: '', sections: [], site: '허가 확인 페이지에서 수도와 전기 공급 상태, 계약전력, 증설 여부, 확인일과 기관 답변을 후보지별로 기록할 수 있습니다.', next: '계량기 사진과 장비 명판을 준비해 수도사업자·한전·전기공사업체에 문의하세요.', link: '/permit' };
const allPosts = [...blogPosts, ...realEstatePosts, ...wastewaterPosts, ...operationsPosts, addressFacilityPost, facilityGroupUseChangePost, violationBuildingPost, handwashWastewaterPost, handwashWastewaterPermitPost, carwashPipeConnectionPost, publicSewerApprovalPost, drivewaySidewalkPermitPost, waterElectricityPost];
const wastewaterSourceNumbers = { 'wastewater-location-map': '01', 'wastewater-layout': '02', 'wastewater-process': '03', 'water-use-calculation': '04', 'wastewater-generation': '05', 'chemical-inventory': '06', 'prevention-facility-design': '07', 'wastewater-flow-diagram': '08', 'sewer-connection': '09', 'sludge-plan': '10', 'wastewater-outsourcing': '11' };
const operationsSourceNumbers = { 'business-registration': '01', 'business-insurance': '02', 'msds-management': '03', 'wastewater-operation-log': '04', 'facility-inspection': '05', 'employee-contract': '06', 'vehicle-intake': '07', 'vehicle-damage-response': '08', 'operation-waste': '09' };
const realEstateSourceNumbers = { 'realestate-documents': '00', 'building-register': '01', 'land-use-plan': '02', 'registry': '03', 'lease-documents': '04', 'existing-plan': '05', 'planned-floor-plan': '06', 'owner-use-change-consent': '07', 'owner-construction-consent': '08' };
function renderSourceArticle(slug) {
  const number = wastewaterSourceNumbers[slug] || operationsSourceNumbers[slug] || realEstateSourceNumbers[slug] || (slug === 'address-facility-permission' || slug === 'facility-group-use-change' || slug === 'violation-building-check' || slug === 'handwash-wastewater-facility' || slug === 'handwash-wastewater-permit' || slug === 'carwash-pipe-connection' || slug === 'public-sewer-approval' || slug === 'driveway-sidewalk-permit' || slug === 'water-electricity-supply' ? '01' : ''); if (!number) return '';
  const source = wastewaterSourceNumbers[slug] ? wastewaterSource : operationsSourceNumbers[slug] ? operationsSource : realEstateSourceNumbers[slug] ? realEstateSource : slug === 'address-facility-permission' ? addressFacilitySource : slug === 'facility-group-use-change' ? facilityGroupUseChangeSource : slug === 'violation-building-check' ? violationBuildingSource : slug === 'handwash-wastewater-facility' ? handwashWastewaterSource : slug === 'handwash-wastewater-permit' ? handwashWastewaterPermitSource : slug === 'carwash-pipe-connection' ? carwashPipeConnectionSource : slug === 'public-sewer-approval' ? publicSewerApprovalSource : slug === 'driveway-sidewalk-permit' ? drivewaySidewalkPermitSource : waterElectricitySource;
  const start = source.indexOf(`## ${number} ·`); if (start < 0) return '';
  const separator = source.indexOf('\n---', start + 1); const nextHeading = source.indexOf('\n## ', start + 1);
  const ends = [separator, nextHeading, source.length].filter((position) => position >= 0); const end = Math.min(...ends);
  const lines = source.slice(start, end).split(/\r?\n/).slice(1); const blocks = []; let paragraph = []; let listType = ''; let listItems = [];
  const inline = (value) => escapeHtml(value).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const flushList = () => { if (listItems.length) { blocks.push(`<${listType}>${listItems.join('')}</${listType}>`); listItems = []; listType = ''; } };
  const flush = () => { if (paragraph.length) { blocks.push(`<p>${inline(paragraph.join(' '))}</p>`); paragraph = []; } };
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { flush(); flushList(); continue; }
    const ordered = trimmed.match(/^\d+\.\s+(.+)$/); const unordered = trimmed.match(/^[-*]\s+(.+)$/);
    if (ordered || unordered) { flush(); const type = ordered ? 'ol' : 'ul'; if (listType && listType !== type) flushList(); listType = type; listItems.push(`<li>${inline((ordered || unordered)[1])}</li>`); continue; }
    flushList();
    if (trimmed.startsWith('### ')) { flush(); blocks.push(`<h3>${escapeHtml(trimmed.slice(4).trim())}</h3>`); continue; }
    if (trimmed.startsWith('**') && trimmed.endsWith('**')) { flush(); blocks.push(`<h2>${escapeHtml(trimmed.slice(2, -2))}</h2>`); continue; }
    if (trimmed.startsWith('**확인 포인트:**')) { flush(); blocks.push(`<div class="blog-highlight"><strong>확인 포인트</strong><span>${escapeHtml(trimmed.replace('**확인 포인트:**', '').trim())}</span></div>`); continue; }
    if (trimmed.startsWith('**체크리스트:**')) { flush(); blocks.push(`<div class="blog-source-checks"><strong>체크리스트</strong><p>${escapeHtml(trimmed.replace('**체크리스트:**', '').trim())}</p></div>`); continue; }
    paragraph.push(trimmed);
  }
  flushList();
  flush(); return `<section class="blog-source-body">${blocks.join('')}</section>`;
}

function postCard(post) { return `<article><span>${escapeHtml(post.category)} · NAVER READY</span><h2>${escapeHtml(post.title)}</h2><p>${escapeHtml(post.intro || post.description)}</p><small>실무 안내 · 확인 순서 · 사이트 활용법</small><a href="${articlePath(post.slug)}">본문 읽기 →</a></article>`; }

function renderList() { const list = document.querySelector('#blogList'); if (list) list.innerHTML = allPosts.map(postCard).join(''); }

function renderPost() {
  const root = document.querySelector('#blogPost'); if (!root) return;
  const slug = decodeURIComponent(location.pathname.replace(/^\/blog\/?/, '').replace(/\/$/, ''));
  const index = allPosts.findIndex((post) => post.slug === slug); const post = allPosts[index];
  if (!post) { root.innerHTML = '<div class="blog-body"><h1>글을 찾을 수 없습니다.</h1><p><a href="/blog">블로그 목록으로 돌아가기</a></p></div>'; return; }
  document.title = `${post.title} · BIGWASH`;
  const sections = post.sections.map((section) => `<section class="blog-post-section"><h2>${escapeHtml(section.title)}</h2>${(section.paragraphs || []).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}${section.checks ? `<ul class="check-list">${section.checks.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}${section.callout ? `<div class="blog-highlight"><strong>확인 포인트</strong><span>${escapeHtml(section.callout)}</span></div>` : ''}</section>`).join('');
  const practical = practicalGuidance[post.slug];
  const practicalMarkup = practical ? `<section class="blog-post-section"><h2>${escapeHtml(practical.title)}</h2>${practical.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}<div class="blog-link-list">${practical.links.map(([label, href]) => `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)} ↗</a>`).join('')}</div><div class="blog-practical-grid">${practical.checks.map(([label, detail]) => `<div><strong>${escapeHtml(label)}</strong><span>${escapeHtml(detail)}</span></div>`).join('')}</div><h3>관할 기관에 물어볼 질문</h3><ol class="blog-question-list">${practical.questions.map((question) => `<li>${escapeHtml(question)}</li>`).join('')}</ol><div class="blog-record"><strong>기록 예시</strong><span>${escapeHtml(practical.record)}</span></div></section>` : '';
  const documentDetail = documentDetails[post.slug];
  const documentMarkup = documentDetail ? `<section class="blog-post-section"><h2>${escapeHtml(documentDetail.title)}</h2><div class="blog-document-table"><div class="blog-document-head"><span>확인 항목</span><span>무엇을 확인하나</span><span>다음 행동</span></div>${documentDetail.rows.map(([label, detail, action]) => `<div class="blog-document-row"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(detail)}</span><span>${escapeHtml(action)}</span></div>`).join('')}</div></section>` : '';
  const longform = wastewaterLongform[post.slug];
  const longformMarkup = longform ? `<section class="blog-longform"><p class="blog-intro">${escapeHtml(longform.lead)}</p>${longform.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}</section>` : '';
  const sourceMarkup = renderSourceArticle(post.slug);
  const articleBody = sourceMarkup || `<p class="blog-intro">${escapeHtml(post.intro)}</p>${longformMarkup}${sections}${practicalMarkup}${documentMarkup}`;
  const previous = allPosts[index - 1]; const next = allPosts[index + 1];
  root.innerHTML = `<header class="blog-hero"><p class="blog-kicker">${escapeHtml(post.category)}</p><h1>${escapeHtml(post.title)}</h1><p class="blog-lead">${escapeHtml(post.description)}</p><div class="blog-meta"><span>2026년 11월 10일</span><span>${sourceMarkup ? '원문 기반 실무 안내 · 읽는 시간 약 8분' : practical || documentDetail || longform ? '본문·실무 안내 포함 · 읽는 시간 약 7분' : '읽는 시간 약 4분'}</span></div></header><div class="blog-body">${articleBody}<h2>사이트에서는 이렇게 활용합니다</h2><p>${escapeHtml(post.site)}</p><p class="blog-note">이 글과 사이트의 안내는 일반적인 준비 정보이며 법률 자문이나 허가 완료 판정이 아닙니다. 최종 확인은 소재지 관할 기관과 전문가에게 요청하세요.</p><h2>다음 단계</h2><p>${escapeHtml(post.next)}</p><section class="blog-cta"><p class="blog-kicker">CONTINUE</p><h2>확인한 내용을<br>후보지 기록으로 남겨보세요.</h2><div><a class="button primary" href="${escapeHtml(post.link)}">관련 기능 열기</a><a class="button" href="/blog">블로그 목록</a></div></section><nav class="blog-pager" aria-label="글 이동">${previous ? `<a href="${articlePath(previous.slug)}">← ${escapeHtml(previous.title)}</a>` : '<span></span>'}${next ? `<a href="${articlePath(next.slug)}">${escapeHtml(next.title)} →</a>` : '<span></span>'}</nav></div>`;
}

renderList(); renderPost();

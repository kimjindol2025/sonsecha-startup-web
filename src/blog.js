import './blog.css';
import './blog-extra.css';
import { blogPosts } from './blog-posts-promo.js';
import { realEstatePosts } from './blog-posts-realestate.js';
import { wastewaterPosts } from './blog-posts-wastewater.js';
import { practicalGuidance } from './blog-practical.js';
import { documentDetails } from './blog-document-details.js';
import { wastewaterLongform } from './blog-wastewater-longform.js';
import wastewaterSource from './blog-wastewater-source.md?raw';

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const articlePath = (slug) => `/blog/${encodeURIComponent(slug)}`;
const allPosts = [...blogPosts, ...realEstatePosts, ...wastewaterPosts];
const wastewaterSourceNumbers = { 'wastewater-location-map': '01', 'wastewater-layout': '02', 'wastewater-process': '03', 'water-use-calculation': '04', 'wastewater-generation': '05', 'chemical-inventory': '06', 'prevention-facility-design': '07', 'wastewater-flow-diagram': '08', 'sewer-connection': '09', 'sludge-plan': '10', 'wastewater-outsourcing': '11' };
function renderSourceArticle(slug) {
  const number = wastewaterSourceNumbers[slug]; if (!number) return '';
  const start = wastewaterSource.indexOf(`## ${number} ·`); if (start < 0) return '';
  const separator = wastewaterSource.indexOf('\n---', start + 1); const nextHeading = wastewaterSource.indexOf('\n## ', start + 1);
  const ends = [separator, nextHeading, wastewaterSource.length].filter((position) => position >= 0); const end = Math.min(...ends);
  const lines = wastewaterSource.slice(start, end).split(/\r?\n/).slice(1); const blocks = []; let paragraph = [];
  const flush = () => { if (paragraph.length) { blocks.push(`<p>${escapeHtml(paragraph.join(' ')).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`); paragraph = []; } };
  for (const line of lines) { const trimmed = line.trim(); if (!trimmed) { flush(); continue; } if (trimmed.startsWith('**') && trimmed.endsWith('**')) { flush(); blocks.push(`<h2>${escapeHtml(trimmed.slice(2, -2))}</h2>`); continue; } if (trimmed.startsWith('**확인 포인트:**')) { flush(); blocks.push(`<div class="blog-highlight"><strong>확인 포인트</strong><span>${escapeHtml(trimmed.replace('**확인 포인트:**', '').trim())}</span></div>`); continue; } if (trimmed.startsWith('**체크리스트:**')) { flush(); blocks.push(`<div class="blog-source-checks"><strong>체크리스트</strong><p>${escapeHtml(trimmed.replace('**체크리스트:**', '').trim())}</p></div>`); continue; } paragraph.push(trimmed); }
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

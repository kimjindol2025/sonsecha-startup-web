import './blog.css';
import './blog-extra.css';
import { blogPosts } from './blog-posts-promo.js';

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const articlePath = (slug) => `/blog/${encodeURIComponent(slug)}`;

function postCard(post) { return `<article><span>${escapeHtml(post.category)} · NAVER READY</span><h2>${escapeHtml(post.title)}</h2><p>${escapeHtml(post.intro || post.description)}</p><small>실무 안내 · 확인 순서 · 사이트 활용법</small><a href="${articlePath(post.slug)}">본문 읽기 →</a></article>`; }

function renderList() { const list = document.querySelector('#blogList'); if (list) list.innerHTML = blogPosts.map(postCard).join(''); }

function renderPost() {
  const root = document.querySelector('#blogPost'); if (!root) return;
  const slug = decodeURIComponent(location.pathname.replace(/^\/blog\/?/, '').replace(/\/$/, ''));
  const index = blogPosts.findIndex((post) => post.slug === slug); const post = blogPosts[index];
  if (!post) { root.innerHTML = '<div class="blog-body"><h1>글을 찾을 수 없습니다.</h1><p><a href="/blog">블로그 목록으로 돌아가기</a></p></div>'; return; }
  document.title = `${post.title} · BIGWASH`;
  const sections = post.sections.map((section) => `<section class="blog-post-section"><h2>${escapeHtml(section.title)}</h2>${(section.paragraphs || []).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}${section.checks ? `<ul class="check-list">${section.checks.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}${section.callout ? `<div class="blog-highlight"><strong>확인 포인트</strong><span>${escapeHtml(section.callout)}</span></div>` : ''}</section>`).join('');
  const previous = blogPosts[index - 1]; const next = blogPosts[index + 1];
  root.innerHTML = `<header class="blog-hero"><p class="blog-kicker">${escapeHtml(post.category)}</p><h1>${escapeHtml(post.title)}</h1><p class="blog-lead">${escapeHtml(post.description)}</p><div class="blog-meta"><span>2026년 11월 10일</span><span>읽는 시간 약 4분</span></div></header><div class="blog-body"><p class="blog-intro">${escapeHtml(post.intro)}</p>${sections}<h2>사이트에서는 이렇게 활용합니다</h2><p>${escapeHtml(post.site)}</p><p class="blog-note">이 글과 사이트의 안내는 일반적인 준비 정보이며 법률 자문이나 허가 완료 판정이 아닙니다. 최종 확인은 소재지 관할 기관과 전문가에게 요청하세요.</p><h2>다음 단계</h2><p>${escapeHtml(post.next)}</p><section class="blog-cta"><p class="blog-kicker">CONTINUE</p><h2>확인한 내용을<br>후보지 기록으로 남겨보세요.</h2><div><a class="button primary" href="${escapeHtml(post.link)}">관련 기능 열기</a><a class="button" href="/blog">블로그 목록</a></div></section><nav class="blog-pager" aria-label="글 이동">${previous ? `<a href="${articlePath(previous.slug)}">← ${escapeHtml(previous.title)}</a>` : '<span></span>'}${next ? `<a href="${articlePath(next.slug)}">${escapeHtml(next.title)} →</a>` : '<span></span>'}</nav></div>`;
}

renderList(); renderPost();

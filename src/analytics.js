const endpoint = '/api/analytics/click';
const interactiveSelector = 'a, button, input, textarea, summary, [role="button"]';

function compact(value, maximum = 120) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maximum);
}

function slug(value, maximum = 100) {
  const normalized = String(value || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return (normalized || 'item').slice(0, maximum);
}

function deviceType() {
  if (globalThis.matchMedia('(max-width: 600px)').matches) return 'mobile';
  if (globalThis.matchMedia('(max-width: 1024px)').matches) return 'tablet';
  return 'desktop';
}

function safeHref(element) {
  if (!(element instanceof HTMLAnchorElement)) return '';
  const raw = element.getAttribute('href') || '';
  if (raw.startsWith('tel:') || raw.startsWith('mailto:') || raw.startsWith('#')) return raw.slice(0, 500);
  try {
    const parsed = new URL(element.href, globalThis.location.href);
    return `${parsed.origin}${parsed.pathname}${parsed.hash}`.slice(0, 500);
  } catch {
    return raw.split('?')[0].slice(0, 500);
  }
}

function sectionFor(element) {
  const cartItem = element.closest('[data-cart-product]');
  if (cartItem) return '장바구니';
  if (element.closest('#quoteModal')) return '견적서';
  const step = element.closest('.step-card')?.querySelector('[data-step]')?.dataset.step;
  if (step) return `창업절차 ${step}단계`;
  const section = element.closest('section[id], aside[id], footer[id], nav[id], header[id]');
  if (section?.id) return section.id;
  if (element.closest('header')) return '상단 메뉴';
  if (element.closest('footer')) return '하단 정보';
  if (element.closest('.roadmap-shop-banner')) return '창업절차 상품 배너';
  return globalThis.location.hash.startsWith('#shop') ? '제품몰' : '창업가이드';
}

function productName(element) {
  return compact(element.closest('.product-card, .product-detail-hero, [data-cart-product]')?.querySelector('h1, h3, .cart-item-copy > strong')?.textContent, 80);
}

function describe(element) {
  const section = sectionFor(element);
  const name = productName(element);
  const explicit = element.dataset.analyticsId;
  if (explicit) return { key: explicit, label: compact(element.dataset.analyticsLabel || element.textContent), kind: 'custom', section };

  if (element.dataset.addProduct) {
    return { key: `product:add:${slug(element.dataset.addProduct)}`, label: `장바구니 담기 · ${name || element.dataset.addProduct}`, kind: 'product', section: '제품몰' };
  }
  if (element.dataset.cartAction) {
    const productId = element.closest('[data-cart-product]')?.dataset.cartProduct || 'unknown';
    return { key: `cart:${slug(element.dataset.cartAction)}:${slug(productId)}`, label: `${compact(element.getAttribute('aria-label') || element.textContent)} · ${name || productId}`, kind: 'cart', section };
  }
  if (element.dataset.productCategory) {
    return { key: `shop:category:${slug(element.dataset.productCategory)}`, label: `상품 분류 · ${compact(element.textContent)}`, kind: 'filter', section: '제품몰' };
  }
  if (element.dataset.step) {
    const title = compact(element.closest('.step-card')?.querySelector('h3')?.textContent);
    return { key: `roadmap:step:${slug(element.dataset.step)}:check`, label: `${element.dataset.step}단계 체크 · ${title}`, kind: 'check', section };
  }
  if (element.dataset.detailCheck) {
    const label = compact(element.closest('label, li')?.textContent);
    return { key: `detail:check:${slug(element.dataset.detailCheck)}`, label: `세부 체크 · ${label}`, kind: 'check', section };
  }
  if (element.dataset.stepStatus) {
    return { key: `roadmap:status:${slug(element.dataset.stepStatus)}`, label: `${section} 판정 변경`, kind: 'select', section };
  }
  if (element.matches('input:not([type="checkbox"]):not([type="radio"]), textarea')) {
    const fieldName = element.id
      || element.name
      || element.dataset.quoteField
      || element.dataset.candidateField
      || element.dataset.detailNote
      || 'field';
    const label = compact(element.closest('label, li')?.querySelector('span, strong')?.textContent)
      || compact(element.getAttribute('aria-label') || element.placeholder)
      || '입력 항목';
    return { key: `field:${slug(fieldName, 140)}`, label: `${label} 입력칸`, kind: 'field', section };
  }

  const productCard = element.closest('.product-card');
  const cardProductId = productCard?.querySelector('[data-add-product]')?.dataset.addProduct;
  if (element instanceof HTMLAnchorElement && cardProductId) {
    const internalDetail = element.hasAttribute('data-product-detail');
    return {
      key: `product:detail:${slug(cardProductId)}`,
      label: `${internalDetail ? '상품 상세' : '공식몰 상세'} · ${name || cardProductId}`,
      kind: 'product',
      section: '제품몰',
      href: safeHref(element),
    };
  }

  const banner = element.closest('.roadmap-shop-banner');
  if (element instanceof HTMLAnchorElement && banner) {
    const bannerIndex = [...document.querySelectorAll('.roadmap-shop-banner')].indexOf(banner) + 1;
    const bannerTitle = compact(banner.querySelector('strong')?.textContent) || `${bannerIndex}번 배너`;
    return { key: `banner:${bannerIndex}`, label: `상품 배너 · ${bannerTitle}`, kind: 'banner', section: '창업절차 상품 배너', href: safeHref(element) };
  }

  const semanticAttributes = [
    ['cartOpen', element.closest('header') ? 'cart:open:nav' : 'cart:open:shop', element.closest('header') ? '상단 장바구니 열기' : '제품몰 장바구니 열기'],
    ['cartClose', 'cart:close', '장바구니 닫기'],
    ['quoteClose', 'quote:close', '견적서 닫기'],
    ['candidateAdd', 'candidate:add', '후보지 추가'],
    ['candidateRemove', 'candidate:remove', '후보지 삭제'],
    ['candidateId', 'candidate:select', '후보지 선택'],
    ['viewTab', `view:${slug(element.dataset.viewTab)}`, `${compact(element.textContent)} 탭`],
    ['phase', `roadmap:phase:${slug(element.dataset.phase)}`, `단계 필터 · ${compact(element.textContent)}`],
  ];
  for (const [attribute, key, label] of semanticAttributes) {
    if (attribute in element.dataset) return { key, label, kind: 'control', section };
  }

  const href = safeHref(element);
  const ariaLabel = compact(element.getAttribute('aria-label') || element.getAttribute('title'));
  const textLabel = compact(element.textContent || element.value);
  const label = ariaLabel || textLabel || element.id || element.tagName.toLowerCase();
  if (href) {
    const locationKey = `${section}:${href}`;
    return { key: `link:${slug(locationKey, 145)}`, label, kind: href.startsWith('tel:') ? 'phone' : 'link', section, href };
  }
  if (element.classList.contains('detail-toggle')) {
    const step = element.closest('.step-card')?.querySelector('[data-step]')?.dataset.step || 'unknown';
    return { key: `roadmap:detail:${slug(step)}`, label: `${section} 상세 열기`, kind: 'control', section };
  }
  const identity = element.id || `${section}:${label}`;
  return { key: `control:${slug(identity, 145)}`, label, kind: element.tagName === 'SUMMARY' ? 'details' : 'control', section };
}

function sendClick(event) {
  const body = JSON.stringify({
    ...event,
    path: `${globalThis.location.pathname}${globalThis.location.hash}`.slice(0, 200),
    device: deviceType(),
  });
  if (navigator.sendBeacon) {
    const sent = navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
    if (sent) return;
  }
  fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    keepalive: true,
    credentials: 'same-origin',
  }).catch(() => {});
}

export function installClickAnalytics() {
  document.addEventListener('click', (event) => {
    const element = event.target.closest?.(interactiveSelector);
    if (!element || element.closest('[data-analytics-ignore]')) return;
    sendClick(describe(element));
  }, { capture: true });

  document.addEventListener('change', (event) => {
    const element = event.target.closest?.('select');
    if (!element || element.closest('[data-analytics-ignore]')) return;
    const description = describe(element);
    sendClick({
      ...description,
      key: `${description.key}:value:${slug(element.value, 40)}`,
      label: `${description.label} · ${compact(element.selectedOptions[0]?.textContent || element.value, 60)}`,
    });
  });
}

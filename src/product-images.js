// Mirror existing catalog photos locally so visitors do not depend on the supplier's server.
const mirroredImages = new Map([
  ['https://www.k002.com/mall/shop_image/202101/20160103_131052.jpg', '/product-images/photo-unavailable.svg'],
  ['https://www.k002.com/mall/shop_image/202101/%C1%A4%BF%C02.jpg', '/product-images/photo-unavailable.svg'],
  ['https://www.k002.com/mall/shop_image/202004/2_sum_500%285%29_1544146108.jpg', '/product-images/photo-unavailable.svg'],
  ['https://www.k002.com/mall/shop_image/202004/2_sum_500%285%29_1547088472.jpg', '/product-images/photo-unavailable.svg'],
]);

export function localProductImage(image) {
  if (typeof image !== 'string') return '';
  return mirroredImages.get(image) || image;
}

export function installProductImageFallbacks(root = document) {
  root.addEventListener('error', (event) => {
    const image = event.target;
    if (image.tagName !== 'IMG' || !image.closest('.product-media, .product-detail-media, .product-related, .cart-item-media, .roadmap-banner-image, #editorImagePreview')) return;
    const fallback = document.createElement('span');
    fallback.className = 'product-image-unavailable';
    fallback.textContent = '사진을 준비 중입니다';
    fallback.setAttribute('role', 'img');
    fallback.setAttribute('aria-label', `${image.alt || '상품'} · 사진을 준비 중입니다`);
    image.replaceWith(fallback);
  }, true);
}

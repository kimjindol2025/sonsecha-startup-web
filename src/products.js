// 상품 등록 단계에서는 아래 products 배열에 상품 객체를 추가합니다.
// image는 public 폴더 기준 경로 또는 https 이미지 주소를 사용할 수 있습니다.
export const productCategories = [
  { id: 'all', label: '전체 상품' },
  { id: 'chemical', label: '세차 케미컬' },
  { id: 'tool', label: '세차 도구' },
  { id: 'equipment', label: '장비·부품' },
  { id: 'safety', label: '안전·관리용품' },
];

export const products = [];

/*
상품 등록 예시
{
  id: 'sample-001',
  name: '상품명',
  category: 'chemical',
  summary: '상품을 한 줄로 소개합니다.',
  price: 25000,
  image: '/products/sample-001.webp',
  badge: 'BEST',
  inStock: true,
  featured: 10,
}
*/

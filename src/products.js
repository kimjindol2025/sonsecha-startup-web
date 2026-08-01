// 상품 등록 단계에서는 아래 products 배열에 상품 객체를 추가합니다.
// image는 public 폴더 기준 경로 또는 https 이미지 주소를 사용할 수 있습니다.
export const productCategories = [
  { id: 'all', label: '전체 상품' },
  { id: 'chemical', label: '세차 케미컬' },
  { id: 'tool', label: '세차 도구' },
  { id: 'equipment', label: '장비·부품' },
  { id: 'safety', label: '안전·관리용품' },
];

export const products = [
  {
    id: 'k002-89',
    name: '하부세차기 (바닥매립형)',
    category: 'equipment',
    summary: '신축·바닥 공사 단계에서 레미콘 아래 매립하는 하부세차 설비입니다. 별도 토목공사가 필요하므로 베이 배수·급수 계획과 함께 검토해야 합니다.',
    details: `제품 개요
세차 베이 바닥에 매립해 차량이 설비 위를 통과할 때 하부 세척에 사용하는 제품입니다. K002 공식 상품 설명은 토목공사 단계에서 레미콘 아래 설치하는 매립형이며, 별도 공사가 필요한 제품이라고 안내합니다.

설치 시점
바닥 콘크리트를 마감한 뒤 추가하는 제품이 아니라 초기 토목·배관 공정에서 위치와 높이를 먼저 정해야 하는 설비입니다. 신축 현장이나 바닥 철거를 포함한 리뉴얼 현장에서 검토하기 적합합니다.

설치 전 확인사항
- 차량 진입 방향과 설비 중심선, 휠 간섭 여부
- 분사수가 모이는 트렌치·집수정과 폐수 배수 경로
- 급수 배관, 펌프 용량, 밸브와 동파 방지 계획
- 레미콘 타설 전 설비 고정·수평·점검구 확보
- 설치 공사, 운송, 시운전이 판매가에 포함되는지 여부

구매 안내
현재 제품몰 기준 품절 상품입니다. 재판매 여부와 현장별 토목 범위는 주문 전에 상담으로 확인해야 합니다. 표시되지 않은 분사압력·사용수량·배관 규격은 임의로 확정하지 말고 판매자에게 현장 조건을 전달해 확인하세요.

자료 기준
K002 공식 상품 페이지의 제품 설명과 공식 설치 사진을 기준으로 작성했습니다.`,
    price: 3000000,
    image: 'https://www.k002.com/mall/shop_image/202101/20160103_131052.jpg',
    shopUrl: 'https://www.k002.com/mall/m_mall_detail.php?ps_ctid=01000000&ps_goid=89',
    badge: '품절',
    inStock: false,
    featured: 120,
  },
  {
    id: 'k002-83',
    name: '폐수처리기 폐수계량기 40A',
    category: 'equipment',
    summary: '폐수처리 배관의 누적량을 확인하는 40A 계량기입니다. 기존 배관 규격·연결 방식과 설치 방향을 확인한 뒤 주문하세요.',
    details: `제품 개요
폐수처리 설비의 배관 구간에 연결해 통과량을 계수하는 40A 규격 계량기입니다. 공식 상품 페이지에는 제품명, 40A 규격, 대한민국 원산지와 제품 사진이 공개돼 있습니다.

활용 목적
폐수처리 공정의 운전 기록을 남길 때 계량기 표시값을 정기적으로 확인하는 용도로 사용할 수 있습니다. 실제 기록 방법과 설치 위치는 해당 시설의 배관 구성과 운영 기준에 맞춰 정해야 합니다.

주문 전 확인사항
- 연결할 기존 배관의 호칭지름이 40A인지 확인
- 나사산·소켓 등 실제 연결 방식과 필요한 부속 확인
- 계량기 설치 방향과 배관의 물 흐름 방향 확인
- 검침 단위와 누적 표시 범위 확인
- 사용 가능한 유량·압력·온도 범위 확인
- 점검·교체할 수 있는 공간과 전후단 밸브 확보 여부

사양 확인 안내
공식 상품 페이지에는 유량 범위, 허용 압력·온도, 연결 나사 규격과 설치 필요 직관부 길이가 표시돼 있지 않습니다. 사진만 보고 배관에 바로 맞는다고 판단하지 말고 기존 계량기와 배관 사진·치수를 판매자에게 전달해 호환 여부를 확인하세요.

자료 기준
K002 공식 상품 페이지의 상품정보고시와 공식 제품 사진을 기준으로 작성했습니다.`,
    price: 198000,
    image: 'https://www.k002.com/mall/shop_image/202101/%C1%A4%BF%C02.jpg',
    shopUrl: 'https://www.k002.com/mall/m_mall_detail.php?ps_ctid=01000000&ps_goid=83',
    inStock: true,
    featured: 119,
  },
  {
    id: 'k002-21',
    name: 'BWS2015 냉수형 고압세척기',
    category: 'equipment',
    summary: '손세차장과 셀프세차장에서 사용하는 BWS2015 냉수 전용 고압세척기입니다.',
    price: 2090000,
    image: 'https://www.k002.com/mall/shop_image/202004/2_sum_500%285%29_1544146108.jpg',
    shopUrl: 'https://www.k002.com/mall/m_mall_detail.php?ps_ctid=01000000&ps_goid=21',
    inStock: true,
    featured: 118,
  },
  {
    id: 'k002-20',
    name: '셀프세차장 폐수처리기 약품 (하나로 or AB)',
    category: 'chemical',
    summary: '셀프세차장 폐수처리 공정용 약품입니다. 하나로형 또는 A/B형은 기존 처리 방식과 수질 조건에 맞춰 선택하고, 투입량은 공급자 지침과 MSDS를 확인해야 합니다.',
    details: `제품 개요
셀프세차장에서 발생한 세차폐수를 처리할 때 사용하는 폐수처리 약품입니다. 공식 상품명은 하나로형 또는 A/B형 선택을 안내하며, 대표 이미지에는 HWC 폐수약품 용기가 표시돼 있습니다.

선택 전 확인사항
- 현재 폐수처리기가 하나로형과 A/B형 중 어느 방식을 사용하는지 확인
- 기존에 사용하던 약품의 제품명·용기 표시·투입 방식 확인
- 일일 처리량과 유입수 상태, 처리 후 수질 변화 기록 준비
- 약품 용량, 구성 수량, 제조·사용기한과 보관 조건 확인
- 자동 투입기·교반기와 함께 사용할 수 있는 제품인지 확인

투입과 운전
공식 상품 페이지에는 성분, 용량과 표준 투입비가 공개돼 있지 않습니다. 임의 비율로 투입하거나 서로 다른 제품을 혼합하지 말고, 기존 처리기 방식과 현장 수질을 판매자에게 전달해 제품 선택과 투입량을 안내받으세요. 투입 전후에는 처리량, 약품 사용량과 처리 상태를 운영 일지에 남기는 것이 좋습니다.

안전 확인
화학제품은 공급자가 제공하는 최신 물질안전보건자료(MSDS)와 용기 경고표지를 먼저 확인해야 합니다. MSDS에 표시된 취급·저장방법, 누출 대응과 개인보호구 기준을 따르고, 식품·세제와 분리해 관계자 외 접근이 어려운 장소에 보관하세요.

자료 기준
K002 공식 상품 페이지의 상품명·대표 이미지와 안전보건공단의 MSDS 제공·확인 안내를 기준으로 작성했습니다.`,
    price: 66000,
    image: 'https://www.k002.com/mall/shop_image/202004/2_sum_500%285%29_1547088472.jpg',
    shopUrl: 'https://www.k002.com/mall/m_mall_detail.php?ps_ctid=01000000&ps_goid=20',
    inStock: true,
    featured: 117,
  },
  {
    id: 'k002-12',
    name: '셀프세차장 세제 인젝터',
    category: 'tool',
    summary: '세제 믹싱과 폼건 사용을 위한 셀프세차장용 인젝터입니다.',
    price: 50000,
    image: 'https://www.k002.com/mall/shop_image/202004/2_sum_500%282%29_1546479568.jpg',
    shopUrl: 'https://www.k002.com/mall/m_mall_detail.php?ps_ctid=01000000&ps_goid=12',
    inStock: true,
    featured: 116,
  },
  {
    id: 'k002-8',
    name: '진공청소기 손세차장 추천모델',
    category: 'equipment',
    summary: '2모터로 흡입력을 강화한 손세차장용 진공청소기입니다.',
    price: 660000,
    image: 'https://www.k002.com/mall/shop_image/202004/2_sum_500%281%29_1546411676.jpg',
    shopUrl: 'https://www.k002.com/mall/m_mall_detail.php?ps_ctid=01000000&ps_goid=8',
    inStock: true,
    featured: 115,
  },
  {
    id: 'k002-78',
    name: '셀프세차장 손세차장 폐수처리기 자동형',
    category: 'equipment',
    summary: '폐수처리 공정을 자동으로 운전해 관리 부담을 줄여주는 설비입니다.',
    price: 9000000,
    image: 'https://www.k002.com/mall/shop_image/202007/sum_500.jpg',
    shopUrl: 'https://www.k002.com/mall/m_mall_detail.php?ps_ctid=01000000&ps_goid=78',
    badge: 'BEST',
    inStock: true,
    featured: 114,
  },
  {
    id: 'k002-7',
    name: '셀프세차장 폐수처리기 수동형 설치',
    category: 'equipment',
    summary: '세차장 폐수를 수동 공정으로 처리하는 설치형 폐수처리기입니다.',
    price: 7000000,
    image: 'https://www.k002.com/mall/shop_image/202004/2_sum_500%282%29_1545034089.jpg',
    shopUrl: 'https://www.k002.com/mall/m_mall_detail.php?ps_ctid=01000000&ps_goid=7',
    inStock: true,
    featured: 113,
  },
  {
    id: 'k002-6',
    name: '셀프세차장 물필터 / 휠터 500mm',
    category: 'equipment',
    summary: '세차장 급수 라인의 이물질을 걸러주는 500mm 교체용 필터입니다.',
    price: 6000,
    image: 'https://www.k002.com/mall/shop_image/202004/2_sum_500%281%29_1544688155.jpg',
    shopUrl: 'https://www.k002.com/mall/m_mall_detail.php?ps_ctid=01000000&ps_goid=6',
    inStock: true,
    featured: 112,
  },
  {
    id: 'k002-5',
    name: '셀프세차장 물필터 / 휠터 750mm',
    category: 'equipment',
    summary: '세차장 급수 라인의 이물질을 걸러주는 750mm 교체용 필터입니다.',
    price: 8800,
    image: 'https://www.k002.com/mall/shop_image/202004/2_sum_750_1544688131.jpg',
    shopUrl: 'https://www.k002.com/mall/m_mall_detail.php?ps_ctid=01000000&ps_goid=5',
    inStock: true,
    featured: 111,
  },
  {
    id: 'k002-2',
    name: '셀프세차장 폐수처리기 일지',
    category: 'safety',
    summary: '폐수처리기 운영 내용을 300일분 기록할 수 있는 관리 일지입니다.',
    price: 5500,
    image: 'https://www.k002.com/mall/shop_image/202004/2_sum_500%2828%29_1544602385.jpg',
    shopUrl: 'https://www.k002.com/mall/m_mall_detail.php?ps_ctid=01000000&ps_goid=2',
    inStock: true,
    featured: 110,
  },
  {
    id: 'k002-1',
    name: '손세차장 BW2015 냉·온수 고압세척기',
    category: 'equipment',
    summary: '빅워시에서 직접 제조·조립한 손세차장용 냉·온수 고압세척기입니다.',
    price: 4180000,
    image: 'https://www.k002.com/mall/shop_image/202004/sum_500%281%29.jpg',
    shopUrl: 'https://www.k002.com/mall/m_mall_detail.php?ps_ctid=01000000&ps_goid=1',
    inStock: true,
    featured: 109,
  },
  {
    id: 'k002-65',
    name: '셀프세차장 진공청소기 카본브러쉬',
    category: 'equipment',
    summary: '진공청소기 모터 전원공급용 카본브러쉬입니다.',
    price: 4400,
    image: 'https://k002.com/mall/shop_image/202005/motor11.jpg',
    shopUrl: 'https://k002.com/mall/m_mall_detail.php?ps_goid=65',
    badge: 'NEW',
    inStock: true,
    featured: 70,
  },
  {
    id: 'k002-64',
    name: '손세차장 진공청소기 습식모터',
    category: 'equipment',
    summary: '물이나 습기를 흡입해도 사용할 수 있는 습식 모터입니다.',
    price: 55000,
    image: 'https://k002.com/mall/shop_image/202005/motor1.jpg',
    shopUrl: 'https://k002.com/mall/m_mall_detail.php?ps_goid=64',
    inStock: true,
    featured: 60,
  },
  {
    id: 'k002-63',
    name: '셀프세차장 진공청소기 건식모터',
    category: 'equipment',
    summary: '일반 건식형 진공청소기에 사용하는 모터 제품입니다.',
    price: 55000,
    image: 'https://k002.com/mall/shop_image/202005/motor2.jpg',
    shopUrl: 'https://k002.com/mall/m_mall_detail.php?ps_goid=63',
    inStock: true,
    featured: 50,
  },
  {
    id: 'k002-62',
    name: '셀프세차장 세차솔대',
    category: 'tool',
    summary: '세차용 브러쉬를 결합해 사용하는 세차솔대입니다.',
    price: 20000,
    image: 'https://k002.com/mall/shop_image/202005/sum_600%286%29.jpg',
    shopUrl: 'https://k002.com/mall/m_mall_detail.php?ps_goid=62',
    inStock: true,
    featured: 40,
  },
  {
    id: 'k002-60',
    name: '고압세척기 압력게이지',
    category: 'equipment',
    summary: '고압세척기의 작동 압력을 확인하는 교체용 부속입니다.',
    price: 22000,
    image: 'https://k002.com/mall/shop_image/202005/sum_600%283%29.jpg',
    shopUrl: 'https://k002.com/mall/m_mall_detail.php?ps_goid=60',
    inStock: true,
    featured: 30,
  },
  {
    id: 'k002-58',
    name: '셀프세차장 필터 하우징',
    category: 'equipment',
    summary: '지하수 또는 수도에 연결해 이물질을 걸러주는 필터 하우징입니다.',
    price: 44000,
    image: 'https://k002.com/mall/shop_image/202005/sum_600.jpg',
    shopUrl: 'https://k002.com/mall/m_mall_detail.php?ps_goid=58',
    badge: 'SALE',
    inStock: true,
    featured: 80,
  },
  {
    id: 'k002-57',
    name: '셀프세차장 랜스형 인젝터',
    category: 'tool',
    summary: '랜스에 호스를 바로 연결해 폼세제를 사용할 수 있는 인젝터입니다.',
    price: 66000,
    image: 'https://k002.com/mall/shop_image/202005/sum_500.jpg',
    shopUrl: 'https://k002.com/mall/m_mall_detail.php?ps_goid=57',
    inStock: true,
    featured: 20,
  },
  {
    id: 'k002-51',
    name: 'XMTA 3.5G 22 고압펌프',
    category: 'equipment',
    summary: '안정적인 내구성을 강조한 셀프세차장용 고압펌프입니다.',
    price: 550000,
    image: 'https://k002.com/mall/shop_image/202004/sum_500%2812%29.jpg',
    shopUrl: 'https://k002.com/mall/m_mall_detail.php?ps_goid=51',
    badge: 'BEST',
    inStock: true,
    featured: 90,
  },
];

/*
상품 등록 예시
{
  id: 'sample-001',
  name: '상품명',
  category: 'chemical',
  summary: '상품을 한 줄로 소개합니다.',
  price: 25000,
  image: '/products/sample-001.webp',
  shopUrl: 'https://k002.com/mall/m_mall_detail.php?ps_goid=상품번호',
  badge: 'BEST',
  inStock: true,
  featured: 10,
}
*/

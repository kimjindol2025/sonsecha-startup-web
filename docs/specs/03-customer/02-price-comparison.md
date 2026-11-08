# [기획서] 세차장 가격 비교 앱 (Carwash Price Comparison App)

> **카테고리**: 03 고객용 앱 (B급 · 수익화)  
> **앱 ID**: `app-cust-price-compare`  
> **목적**: 노터치 코스별 가격, 셀프세차 기본요금 및 초당 환산 가격, 드라잉존 청소기/에어건 비용을 지역별로 객관적으로 비교

---

## 1. 서비스 개요 및 타깃
- **대상 사용자**: 가성비를 중시하는 알뜰 운전자 및 가격 정책을 고민하는 세차장 예비 창업자
- **핵심 가치**:
  - 매장마다 제각각인 기본요금(예: 3,000원에 3분 vs 4,000원에 4분 30초)을 **"분당 단가"**로 정규화 비교
  - 노터치 코스별(기본 vs 하부 vs 폼 vs 프리미엄) 가격표 한눈에 비교
  - RF카드 충전 보너스율(10% vs 20%) 비교로 실질 체감 할인율 제공

---

## 2. 주요 기능 및 정규화 비교 지표

| 지표명 | 계산 방식 및 설명 | 고객 편익 |
| :--- | :--- | :--- |
| **셀프세차 분당 요금** | $\text{기본요금} \div \text{기본제공시간(분)}$ (예: 3,000원/3분 = 1,000원/분) | 직관적인 가성비 판단 가능 |
| **노터치 풀코스 가격** | [기본세차 + 하부세차 + 스노우폼 + 발수코팅] 포함 단가 | 옵션 장난 없는 실부담액 비교 |
| **진공/에어건 단가** | 동전 500원당 작동 시간(초) (예: 500원당 180초 vs 240초) | 드라잉존 가성비 확인 |
| **카드 충전 실할인율** | $\frac{\text{추가 적립금}}{\text{실제 충전금액} + \text{추가 적립금}} \times 100 (\%)$ | 최대 혜택 매장 추천 |

---

## 3. 데이터 스키마

```typescript
export interface CarwashPricingScheme {
  carwashId: string;
  updatedAt: string;
  selfWash: {
    basePrice: number;          // 기본 요금 (예: 3,000원)
    baseTimeSeconds: number;    // 기본 시간 (예: 180초)
    pricePerMinute: number;     // 자동 계산 (분당 환산가)
    extensionPrice: number;     // 연산 시간당 추가 요금
  };
  touchlessWash: {
    basicPrice: number;         // 10,000원
    underbodyOptionPrice: number;// 2,000원
    premiumPrice: number;       // 15,000원
  };
  vacuumAirGun: {
    pricePerSlot: number;       // 500원
    durationSeconds: number;    // 240초
  };
  rfCardBonusTiers: Array<{
    chargeAmount: number;       // 50,000원
    rewardAmount: number;       // 60,000원 (실할인율 16.7%)
  }>;
}
```

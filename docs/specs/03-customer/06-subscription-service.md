# [기획서] 세차 구독 서비스 앱 (Carwash Subscription App)

> **카테고리**: 03 고객용 앱 (B급 · 수익화)  
> **앱 ID**: `app-cust-subscription`  
> **목적**: 월 정액 결제(예: 월 39,000원)로 노터치 자동세차 무제한 또는 월 4회 이용권을 제공하여 반복 매출(ARR)을 창출

---

## 1. 서비스 개요 및 타깃
- **대상 사용자**: 출퇴근 거리가 길어 차량을 항상 깨끗하게 유지해야 하는 차주, 영업용 법인차량
- **핵심 가치**:
  - 고객: 회당 15,000원인 프리미엄 세차를 월 4회 이용 시 50% 이상 비용 절감
  - 점주: 비수기(장마철/혹한기)에도 안정적인 **정기 고정 구독 매출(MRR)** 확보
  - LPR 번호판 자동 인식으로 **현장 대기 없이 논스톱 자동 진입**

---

## 2. 구독 플랜 설계

| 플랜명 | 월 구독료 | 제공 혜택 | 1회당 환산가 | 비고 |
| :--- | :---: | :--- | :---: | :--- |
| **스탠다드 월 2회권** | 22,000원 | 노터치 기본+하부 코스 2회 | 11,000원 | 월 1~2회 세차 오너 |
| **프리미엄 월 4회권** | 39,000원 | 노터치 프리미엄 코팅 4회 | 9,750원 | **가장 인기 있는 주간 1회 플랜** |
| **무제한 패스권** | 59,000원 | 1일 1회 한정 무제한 이용 | - | 택시, 화물, 카셰어링 제외 |

---

## 3. 어뷰징(부정 사용) 방지 규칙
- **차량번호 1대 1계정 원칙**: 구독 계정당 등록된 차량번호 1대만 인증 허용 (패밀리/타인 차량 대여 불가)
- **1일 1회 제한**: 무제한 패스라도 동일 날짜 2회 이상 연속 진입 차단 (시스템 쿨다운 12시간)

---

## 4. 데이터 스키마

```typescript
export interface CarwashSubscription {
  subscriptionId: string;       // "SUB-202611-001"
  userPhone: string;
  registeredPlate: string;      // "34나 9876"
  planType: 'biweekly_2' | 'weekly_4' | 'unlimited';
  monthlyFee: number;           // 39,000
  nextBillingDate: string;      // YYYY-MM-DD
  billingCycleDay: number;      // 매월 15일
  remainingRoundsThisMonth: number; // 잔여 횟수 (무제한은 -1)
  isActive: boolean;
  cancelRequested: boolean;
}
```

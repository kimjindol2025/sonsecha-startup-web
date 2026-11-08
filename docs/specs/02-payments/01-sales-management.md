# [기획서] 세차장 매출관리 앱 (Carwash Sales Management App)

> **카테고리**: 02 매출·결제 (A급 · 현장 필수)  
> **앱 ID**: `app-pay-sales`  
> **목적**: 코인·RF카드·신용카드·간편결제·현금 시재를 장비별, 시간대별, 코스별로 일자별 기록하고 객단가 및 마진을 정밀 분석

---

## 1. 서비스 개요 및 타깃
- **대상 사용자**: 세차장 점주, 회계/세무 대리인
- **핵심 가치**:
  - 결제 수단별 수수료(카드 1.5~2.5%, 간편결제 2~3%) 차감 후 **실 입금액(Net Payout)** 정산
  - 요일별, 날씨별, 코스별 객단가 추이 비교로 최적 가격 정책 수립
  - 세무 신고용 일별/월별 매출 원장(장부) 자동 생성

---

## 2. 주요 기능 요구사항

| 기능 ID | 기능명 | 상세 내용 |
| :--- | :--- | :--- |
| `FEAT-SL-01` | **다채널 결제 종합 집계** | 신용카드, 카카오/네이버/삼성페이, RF카드 충전, 코인/현금 시재 통합 |
| `FEAT-SL-02` | **코스별 매출 분석** | 기본 코스, 하부세차 추가, 버블폼, 최고급 코팅 코스별 판매 비중 및 기여도 |
| `FEAT-SL-03` | **대당 객단가(ATV) 추이 분석**| 일일 총 방문 차량수 대비 실 순매출액 기반 대당 객단가 추적 |
| `FEAT-SL-04` | **환불 및 취소 원인 관리** | 승인 취소 건수, 취소 금액, 기계 중단/단순 변심 사유별 분류 |

---

## 3. 데이터 입력 스키마

```typescript
export interface DailySalesRecord {
  salesDate: string;            // YYYY-MM-DD
  weather: 'sunny' | 'cloudy' | 'rain' | 'snow';
  
  // 코스별 판매 대수
  courses: {
    basicCount: number;         // 기본 세차 (예: 10,000원)
    underbodyCount: number;     // 하부 세차 (예: 12,000원)
    bubbleCount: number;        // 버블 세차 (예: 13,000원)
    premiumCount: number;       // 프리미엄 (예: 15,000원)
  };
  
  // 결제 수단별 실 매출액
  channels: {
    kioskCreditCard: number;    // 키오스크 신용/체크카드
    kioskSimplePay: number;     // 삼성페이, 카카오페이 등
    rfCardCashReload: number;   // RF카드 현금 충전액
    rfCardCreditReload: number; // RF카드 카드 충전액
    coinCashVault: number;      // 진공청소기/동전기기 현금
  };
  
  refundTotalAmount: number;    // 환불 및 승인 취소 총액
  netRevenue: number;           // 순 매출액 (자동 계산)
  totalCarsWashed: number;      // 총 세차 대수 (자동 계산)
  averageTicketValue: number;   // 대당 객단가 (자동 계산)
}
```

---

## 4. 핵심 지표 계산 공식
- **총 세차 대수** = `basicCount + underbodyCount + bubbleCount + premiumCount`
- **총 순매출액** = `∑(채널별 매출액) - refundTotalAmount`
- **대당 평균 객단가** = `총 순매출액 ÷ 총 세차 대수`
- **하부세차 선택률** = `underbodyCount ÷ 총 세차 대수 × 100 (%)`

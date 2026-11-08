# [기획서] 매출 이상감지 앱 (Sales Anomaly Detector App)

> **카테고리**: 02 매출·결제 (A급 · 현장 필수)  
> **앱 ID**: `app-pay-anomaly-detector`  
> **목적**: 주말 피크타임 특정 베이 매출 0원, 날씨 대비 급격한 매출 감소, 비정상적 환불 급증 등 결제기 장애나 운영 사고를 조기 탐지하여 알림

---

## 1. 서비스 개요 및 타깃
- **대상 사용자**: 세차장 점주, 다점포 운영 프랜차이즈 본사
- **핵심 가치**:
  - 장비나 키오스크가 고장 났는데 점주가 반나절 동안 모르고 지나치는 사태 방지
  - 날씨(맑음/비/황사/꽃가루) 빅데이터 기반 기대 매출과 실제 매출 대조 분석
  - 부정 결제(직원 시재 횡령, 비정상 쿠폰 대량 사용) 이상 패턴 필터링

---

## 2. 주요 탐지 규칙 (Anomaly Detection Rules)

| 규칙 코드 | 규칙명 | 탐지 조건 | 알림 심각도 |
| :--- | :--- | :--- | :---: |
| `RULE-ANOM-01` | **베이별 매출 불균형 (장애 의심)** | 주말 피크시간(11:00~16:00) 1호기 매출 50만원 vs 2호기 매출 0원 | <span style="color:red">긴급 (Critical)</span> |
| `RULE-ANOM-02` | **환불 비율 급증 (기계 불량)** | 당일 결제 건수 대비 환불 건수 비율이 5%를 초과할 때 | <span style="color:orange">주의 (Warning)</span> |
| `RULE-ANOM-03` | **날씨 대비 매출 급감** | 날씨 '맑음' 주말인데 전월 동요일 평균 대비 실매출이 40% 이상 하회 | <span style="color:orange">주의 (Warning)</span> |
| `RULE-ANOM-04` | **심야 비정상 승인/취소** | 심야(02:00~05:00) 연속 3회 이상 동일 카드 승인/취소 반복 | <span style="color:blue">정보 (Info)</span> |

---

## 3. 데이터 구조 및 알고리즘

```typescript
export interface AnomalyAlert {
  alertId: string;              // "ALT-202611-001"
  ruleCode: string;             // "RULE-ANOM-01"
  ruleName: string;
  severity: 'critical' | 'warning' | 'info';
  detectedAt: string;           // 탐지 시각
  
  contextData: {
    targetBay?: string;
    expectedRevenue: number;    // 기대 매출액
    actualRevenue: number;      // 실제 매출액
    deviationPercent: number;   // 편차율 (%)
    weather: string;
  };
  
  message: string;              // 점주 전달 메시지
  isAcknowledged: boolean;      // 점주 확인 여부
  acknowledgedAt?: string;
}
```

---

## 4. 기대 효과
- 키오스크 단말기 통신 먹통으로 인한 반나절 매출 손실(평균 150만~300만 원) 즉각 차단
- 이상 징후 발생 후 평균 인지 시간: 기존 4시간 이상 → **15분 이내로 단축**

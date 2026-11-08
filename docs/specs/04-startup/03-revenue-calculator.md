# [기획서] 세차장 예상매출 계산기 (Carwash Revenue Simulator)

> **카테고리**: 04 창업 서비스 (B급 · 수익화)  
> **앱 ID**: `app-startup-revenue-calc`  
> **목적**: 베이 수, 평균 객단가, 일일 운영 시간, 회전율, 날씨 변수를 반영하여 현실적인 월간/연간 예상 매출 및 손익분기점(BEP)을 시뮬레이션

---

## 1. 서비스 개요 및 타깃
- **대상 사용자**: 금융권 창업 대출 신청자, 사업계획서 작성 창업자, 동업 투자자
- **핵심 가치**:
  - 장밋빛 환상 제거: 1년 중 비 오는 날(연간 약 100일)과 비수기 가동률을 반영한 **보수적/중립적/낙관적 3단 시나리오** 제공
  - 고정비(임대료, 전기세, 수도세, 인건비)와 변동비(약품비, 결제수수료)를 제산한 **순수익(EBITDA) 산출**

---

## 2. 시뮬레이션 파라미터 및 수식

### 입력 파라미터
1. `bayCount`: 세차 베이 수 (예: 2베이, 3베이)
2. `avgTicket`: 대당 평균 객단가 (예: 13,000원)
3. `dailyOperatingHours`: 1일 운영 시간 (예: 16시간 또는 24시간)
4. `weekendRotationPerBay`: 주말 피크 시간당 베이 회전 대수 (보통 5~8대/h)
5. `weekdayRotationPerBay`: 평일 시간당 베이 회전 대수 (보통 2~4대/h)
6. `monthlyRainyDays`: 월평균 비/눈 오는 날 (보통 6~8일)

### 산출 수식
$$\text{평일 1일 매출} = \text{베이수} \times \text{평일회전수} \times \text{객단가} \times \text{가동시간}$$
$$\text{주말 1일 매출} = \text{베이수} \times \text{주말회전수} \times \text{객단가} \times \text{가동시간}$$
$$\text{월 총매출} = (\text{평일매출} \times \text{맑은 평일수}) + (\text{주말매출} \times \text{맑은 주말수}) + (\text{우천일 베이스 매출})$$
$$\text{월 순이익} = \text{월 총매출} - (\text{임대료} + \text{전기·수도세} + \text{약품비} + \text{인건비} + \text{수수료})$$

---

## 3. 데이터 스키마

```typescript
export interface RevenueSimulationResult {
  monthlyGrossRevenue: {
    conservative: number;      // 보수적 시나리오 (월 2,200만원)
    neutral: number;           // 중립적 시나리오 (월 3,100만원)
    optimistic: number;        // 낙관적 시나리오 (월 4,200만원)
  };
  monthlyExpenses: {
    rent: number;
    utilities: number;         // 전기 및 상수도 (매출의 약 10~12%)
    chemicals: number;         // 세제 및 왁스 (매출의 약 5~7%)
    labor: number;             // 직원 인건비
    pgFee: number;             // 카드 수수료 (약 2.5%)
  };
  netProfit: number;           // 월 추정 순이익
  bepCarsPerDay: number;       // 손익분기 일일 최소 세차 대수
  paybackPeriodMonths: number; // 초기 창업비용 회수 소요 개월수
}
```

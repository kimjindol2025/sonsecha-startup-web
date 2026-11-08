# [기획서] 세차장 가치평가 앱 (Carwash Business Valuation App)

> **카테고리**: 05 세차장 거래·부동산 (C급 · 확장)  
> **앱 ID**: `app-estate-valuation`  
> **목적**: 월 매출, 영업이익, 장비 감가상각, 상권 희소성, 잔여 임대기간을 반영하여 세차장 매장의 적정 시설권리금 및 적정 인수가격을 산정

---

## 1. 서비스 개요 및 타깃
- **대상 사용자**: 세차장 인수 희망자, 매각 희망 점주, 권리금 분쟁 조정 전문가
- **핵심 가치**:
  - 부르는 게 값인 '깜깜이 권리금' 탈피 → 금융권 DCF(현금흐름할인법) 및 EV/EBITDA 배수 모델 적용
  - 장비 노후도(연식별 감가상각)를 객관적으로 차감하여 과도한 권리금 거품 제거

---

## 2. 3대 가치평가 방식 및 산식

### (1) 수익환원법 (EBITDA 배수법 - 가장 널리 사용)
$$\text{적정 권리금} = \text{연간 순영업이익(EBITDA)} \times \text{적정 회수 배수 (약 1.5 ~ 2.5배)}$$
- *예*: 월 순이익 1,000만 원(연 1억 2,000만 원) 매장 $\rightarrow$ 적정 시설권리금: **1억 8,000만 ~ 3억 원**

### (2) 장비 원가 감가상각법 (비용 접근법)
$$\text{장비 잔존가치} = \text{장비 최초 취득가} \times (1 - \text{상각률} \times \text{경과년수})$$
- 세차 장비 내구연수: 통상 7~8년 (연간 약 12~14% 정액 감가상각 적용)

### (3) 입지 프리미엄 가산/차감
- 신규 인허가 불가지역(인근 조례 강화로 신규 허가 불가능한 독점 매장): **+20~30% 프리미엄**
- 잔여 임대차 계약 2년 미만 + 재계약 불투명: **-30~50% 디스카운트**

---

## 3. 데이터 스키마

```typescript
export interface CarwashValuationReport {
  annualNetProfit: number;      // 연간 순이익
  equipmentResidualValue: number;// 장비 잔존가치
  recommendedMultiple: number;  // 1.8x
  zoningExclusivityBonus: number;// 신규 허가 불가 프리미엄
  leaseRiskDiscount: number;    // 임대차 리스크 차감액
  
  estimatedFairPrice: {
    minPrice: number;           // 하한 적정가
    fairPrice: number;          // 중간 적정가 (권장 인수가)
    maxPrice: number;           // 상한가
  };
  roiExpectedYears: number;     // 예상 원금 회수 기간 (년)
}
```

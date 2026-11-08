# [기획서] 세차장 입지분석 앱 (Carwash Location Feasibility App)

> **카테고리**: 04 창업 서비스 (B급 · 수익화)  
> **앱 ID**: `app-startup-location-analysis`  
> **목적**: 주소 입력 시 배후 아파트 세대수, 차량등록대수, 도로 통행량, 감속 차선 유무, 반경 3km 내 경쟁 세차장 분포를 분석하여 입지 타당성 점수(Score) 산출

---

## 1. 서비스 개요 및 타깃
- **대상 사용자**: 유휴 토지를 보유한 토지주, 세차장 부지 물색 중인 창업자, 프랜차이즈 개발팀
- **핵심 가치**:
  - 눈대중 상권 분석 탈피 → 공공 데이터 기반의 정량적 입지 등급(A~E) 제공
  - 좌회전 진입 가능 여부, 차량 속도 60km/h 초과 도로의 진입 위험성 평가
  - 반경 3km 내 경쟁 매장과의 공급 과잉 여부 판정

---

## 2. 5대 입지 평가 지표 및 가중치

| 평가 축 | 세부 지표 | 배점 | 판정 기준 |
| :--- | :--- | :---: | :--- |
| **1. 도로 및 진입성** | 접면 도로 차로수, 좌회전 포켓 유무, 진입 시야각 | 25점 | 왕복 4차로 이상 + 감속 진입 용이 시 만점 |
| **2. 배후 차량 수요** | 반경 3km 내 등록 차량 대수, 대단지 아파트 세대수 | 25점 | 등록 차량 3만 대 이상 또는 1만 세대 이상 시 만점 |
| **3. 경쟁 강도** | 반경 3km 내 기존 노터치/셀프 베이 수 | 20점 | 동일 상권 내 노터치 0~1곳 시 만점 (희소성) |
| **4. 인프라 기반** | 전력 증설(100kW) 용량, 공공 하수관(오수관) 인입 거리 | 20점 | 오수관 직결 가능 + 전주 인접 시 만점 |
| **5. 민원 위험도** | 주거지(빌라/아파트)와의 이격 거리, 소음·조명 규제 | 10점 | 주거지와 50m 이상 이격 시 만점 (민원 안심) |

---

## 3. 데이터 스키마

```typescript
export interface LocationFeasibilityReport {
  address: string;
  roadName: string;
  trafficSpeedKmh: number;      // 도로 통행 속도
  hasDecelerationLane: boolean; // 감속 차선 여부
  canTurnLeft: boolean;         // 좌회전 진입 가능 여부
  surroundingApartmentUnits: number; // 반경 3km 세대수
  registeredCars3km: number;    // 등록 차량수
  competingBays3km: number;     // 경쟁 베이 수
  distanceToSewerM: number;     // 오수관 거리 (m)
  totalFeasibilityScore: number;// 0 ~ 100점
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  aiRecommendation: string;    // 종합 입지 소견
}
```

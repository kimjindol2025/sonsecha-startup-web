# [기획서] 내 주변 세차장 찾기 앱 (Nearby Carwash Finder App)

> **카테고리**: 03 고객용 앱 (B급 · 수익화)  
> **앱 ID**: `app-cust-nearby-finder`  
> **목적**: GPS 위치 기반으로 주변의 노터치 자동세차, 24시 셀프세차, 손세차장을 검색하고 시설 스펙(베이 수, 높이제한, 온수 여부, 하부세차)과 실제 후기/사진을 제공

---

## 1. 서비스 개요 및 타깃
- **대상 사용자**: 세차장 방문을 원하는 일반 운전자 (특히 튜닝카, 대형 SUV, 초보 세차족)
- **핵심 가치**:
  - 내 차가 들어갈 수 있는 세차장 필터링 (전고 2.1m 이상, 루프박스 장착 차량 가능 여부)
  - 노터치 전용, 동절기 온수 가동, 하부세차 노즐 구비 여부 등 정밀 시설 필터링
  - T맵/카카오내비/네이버지도 길안내 1초 연동

---

## 2. 주요 기능 요구사항

| 기능 ID | 기능명 | 상세 내용 |
| :--- | :--- | :--- |
| `FEAT-NB-01` | **위치 기반 지도 탐색** | 현 위치 기준 반경 3km/5km/10km 세차장 핀 표시 및 거리순/평점순 정렬 |
| `FEAT-NB-02` | **차량 맞춤형 필터** | 진입 가능 전고(2.0m, 2.1m, 2.3m), 루프박스 허용, 트레일러/캠핑카 진입 가능 여부 |
| `FEAT-NB-03` | **설비 스펙 상세 조회** | 세차 베이 수, 드라잉존 면수, 동절기 온수 여부, 고압수 압력, 매트세척기 구비 여부 |
| `FEAT-NB-04` | **실시간 운영 정보** | 24시간 영업 여부, 야간 유/무인 여부, 동파로 인한 임시 휴무 실시간 표시 |

---

## 3. 데이터 스키마

```typescript
export interface CarwashLocationDetail {
  carwashId: string;            // "CW-SEOUL-001"
  name: string;                 // "빅워시 24시 노터치 김포점"
  lat: number;
  lng: number;
  address: string;
  roadAddress: string;
  phone: string;
  type: 'touchless_auto' | 'self_service' | 'hand_wash' | 'hybrid';
  maxVehicleHeightM: number;    // 진입제한 전고 (예: 2.15)
  bayCount: number;             // 베이 수
  dryingZoneCount: number;      // 드라잉존 수
  features: {
    winterHotWater: boolean;    // 동절기 온수 제공
    underbodyWash: boolean;     // 하부세차 노즐
    roofboxAllowed: boolean;    // 루프박스 진입 허용
    airGunCount: number;
    vacuumCount: number;
    hasRestroom: boolean;
  };
  operatingHours: string;       // "24시간 연중무휴 (유인 09:00~19:00)"
  isCurrentlyOpen: boolean;
}
```

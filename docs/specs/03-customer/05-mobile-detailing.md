# [기획서] 출장세차 예약 앱 (Mobile On-Demand Wash App)

> **카테고리**: 03 고객용 앱 (B급 · 수익화)  
> **앱 ID**: `app-cust-mobile-detailing`  
> **목적**: 고객이 지정한 아파트 지하주차장 또는 회사 주차장으로 출장 세차 매니저가 방문하여 워터리스(Waterless) 또는 스팀 세차를 시공하고 완료 사진을 공유

---

## 1. 서비스 개요 및 타깃
- **대상 사용자**: 
  - 고객: 세차장에 갈 시간이 없는 바쁜 맞벌이 부부, 법인 차량 관리자
  - 매니저: 출장 세차 창업자, 긱워커(프리랜서) 디테일러
- **핵심 가치**:
  - 주차 위치 지정(예: "B2층 14번 기둥 앞, 차키 보관 위치")
  - 비대면 시공 후 **전/후 비교 사진 6장 이상 의무 전송**
  - 월 2회/4회 정기 야간 방문 구독 연동

---

## 2. 주요 기능 및 작업 보고 플로우

| 단계 | 기능명 | 상세 내용 |
| :--- | :--- | :--- |
| **1단계** | **주차 위치 & 차량 정보 접수** | 아파트 단지명, 동호수, 지하주차장 층수/기둥 번호, 차량번호 등록 |
| **2단계** | **작업자 매칭 및 출동** | 인근 지역 전담 출장 매니저 자동 배정 및 이동 알림 |
| **3단계** | **시공 전 상태 검수** | 기존 도장면 긁힘, 휠 손상 사진 촬영 등록 (분쟁 예방) |
| **4단계** | **친환경 시공 & 완료 보고** | 워터리스 약품 분사 및 버핑 완료 후 전후 사진 앱 리포트 전송 |

---

## 3. 데이터 스키마

```typescript
export interface MobileWashOrder {
  orderId: string;              // "MOB-202611-001"
  customerPhone: string;
  parkingLocation: {
    complexName: string;        // "래미안 퍼스티지"
    buildingUnit: string;       // "104동 앞 지하주차장"
    floorCol: string;           // "B2층 C12 기둥"
  };
  carNumber: string;
  servicePackage: 'waterless_exterior' | 'interior_exterior_steam' | 'premium_wax';
  managerId: string;
  beforePhotos: string[];       // 시공 전 사진 4장
  afterPhotos: string[];        // 시공 후 사진 4장
  price: number;
  paymentStatus: 'paid' | 'pending';
  orderStatus: 'dispatched' | 'washing' | 'completed';
}
```

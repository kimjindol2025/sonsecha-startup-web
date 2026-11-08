# [기획서] 차량 세차 관리 앱 (Vehicle Wash & Detailing History App)

> **카테고리**: 03 고객용 앱 (B급 · 수익화)  
> **앱 ID**: `app-cust-vehicle-history`  
> **목적**: 차량별 세차 일시, 시공 코스(하부/코팅), 유리막 코팅 시공일, 왁스 지속 기간, 타이어 공기압 점검일을 차계부 형태로 누적 관리

---

## 1. 서비스 개요 및 타깃
- **대상 사용자**: 내 차를 아끼는 환자급 디테일러 및 차량 자산 가치 유지를 원하는 오너
- **핵심 가치**:
  - "내 차 마지막 세차 언제 했지?" 고민 해결 (D+일수 표시)
  - 유리막 코팅, 발수코팅 보증기간 및 재시공 권장 주기 알림 (Push)
  - 중고차 매각 시 디테일링 정비 이력서로 활용 (차량 관리 증빙)

---

## 2. 주요 기능 요구사항

| 기능 ID | 기능명 | 상세 내용 |
| :--- | :--- | :--- |
| `FEAT-VH-01` | **차량별 세차 타임라인** | 일자별 방문 매장, 세차 코스(노터치/손세차), 소요 비용 자동 누적 |
| `FEAT-VH-02` | **코팅 지속 주기 타이머** | 왁스(3~4주), 유리발수(3개월), 유리막코팅(1년) 잔여 수명 게이지 시각화 |
| `FEAT-VH-03` | **비 오는 날 전후 세차 알림**| 기상청 강수 예보 연동: 비 온 뒤 염화칼슘/흙먼지 세척 D-Day 권장 알림 |
| `FEAT-VH-04` | **차계부 지출 통계** | 월간/연간 세차 비용, 케미컬 구매액, 디테일링 총 지출 리포트 |

---

## 3. 데이터 스키마

```typescript
export interface VehicleWashProfile {
  carNumber: string;            // "56다 7890"
  carModel: string;             // "BMW 520i M Sport"
  paintColor: string;           // "소피스토 그레이"
  coatingStatus: {
    ceramicCoatingDate?: string;
    waterRepellentDate?: string;
    lastWashDate: string;
    daysSinceLastWash: number;  // 자동 계산
  };
  washHistory: Array<{
    date: string;
    carwashName: string;
    serviceCategory: 'touchless' | 'self' | 'detailing';
    cost: number;
    notes?: string;
  }>;
}
```

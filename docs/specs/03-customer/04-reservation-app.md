# [기획서] 예약 세차 앱 (Carwash Reservation App)

> **카테고리**: 03 고객용 앱 (B급 · 수익화)  
> **앱 ID**: `app-cust-reservation`  
> **목적**: 디테일링 손세차, 프리미엄 스팀세차, 유리막 코팅 시공, 지정 시간대 노터치 우선 진입 예약을 온라인으로 접수하고 매장 스케줄을 관리

---

## 1. 서비스 개요 및 타깃
- **대상 사용자**: 
  - 고객: 대기 없이 약속된 시간에 확실하게 세차 서비스를 받고 싶은 수입차/디테일링 오너
  - 점주: 노쇼(No-Show)를 방지하고 작업자의 일정을 100% 효율화하고 싶은 디테일링 샵 대표
- **핵심 가치**:
  - 예약금 결제를 통한 **노쇼 방지 (예약금 10~20%)**
  - 차종별(경차/세단/중형SUV/대형SUV) 표준 작업 소요 시간 자동 블록 배정
  - 예약 확정/D-1 알림톡 자동 발송

---

## 2. 주요 기능 요구사항

| 기능 ID | 기능명 | 상세 내용 |
| :--- | :--- | :--- |
| `FEAT-RSV-01` | **실시간 캘린더 슬롯 조회**| 작업자/베이별 비어있는 30분/1시간 단위 예약 가능 슬롯 확인 |
| `FEAT-RSV-02` | **차종 및 옵션 선택** | 차종별 추가금(대형/RV +1~2만원), 유막제거, 가죽시트 코팅 등 옵션 커스텀 |
| `FEAT-RSV-03` | **노쇼 방지 예약금 결제** | PG사 연동 카드 결제 또는 네이버페이 간편결제 |
| `FEAT-RSV-04` | **작업 전/후 사진 전송** | 시공 완료 후 휠, 엔진룸, 실내 완료 사진을 고객 앱으로 자동 리포트 |

---

## 3. 데이터 스키마

```typescript
export interface CarwashBooking {
  bookingId: string;            // "BK-202611-001"
  shopId: string;
  customerPhone: string;
  customerName: string;
  carModel: string;             // "제네시스 G80"
  carNumber: string;
  serviceType: 'detail_handwash' | 'steam_wash' | 'glass_coating' | 'interior_cleaning';
  bookingDate: string;          // YYYY-MM-DD
  timeSlot: string;             // "14:00~15:30"
  durationMinutes: number;      // 90분
  totalPrice: number;           // 80,000원
  depositPaid: number;          // 20,000원
  status: 'confirmed' | 'in_progress' | 'completed' | 'cancelled_refunded' | 'no_show';
}
```

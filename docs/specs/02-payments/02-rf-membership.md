# [기획서] RF카드 회원관리 앱 (RF Membership Card App)

> **카테고리**: 02 매출·결제 (A급 · 현장 필수)  
> **앱 ID**: `app-pay-rf-membership`  
> **목적**: 세차장 RF카드 발급, 보너스 충전 프로모션, 실시간 잔액 조회, 장비별 사용 내역 추적, 분실 정지 및 단골 회원 등급제 운영

---

## 1. 서비스 개요 및 타깃
- **대상 사용자**: 세차장 점주, 현장 직원, 단골 이용 고객
- **핵심 가치**:
  - 선불 충전을 통한 **미래 현금 흐름 조기 확보(선수금 매출)**
  - 충전 보너스(예: 3만원 충전 시 3.5만원 적립)를 통한 락인(Lock-in) 효과
  - 카드 분실 시 잔액 이관 및 부정 사용 방지

---

## 2. 주요 기능 요구사항

| 기능 ID | 기능명 | 상세 내용 |
| :--- | :--- | :--- |
| `FEAT-RF-01` | **카드 발급 및 등록** | 실물 RF카드 UID 번호 태깅, 고객 휴대폰 번호 매핑, 초기 보증금(예: 1,000원) 처리 |
| `FEAT-RF-02` | **충전 및 보너스 정책** | 금액대별 보너스율 자동 적용 (1만 원: 1만 원, 3만 원: 3만 4천 원, 5만 원: 6만 원) |
| `FEAT-RF-03` | **잔액 및 사용 이력 조회** | 베이별 결제(노터치, 고압수, 폼건, 드라잉존 청소기) 일시 및 차감액 추적 |
| `FEAT-RF-04` | **분실 정지 및 잔액 이관** | 분실 신고 시 즉시 카드 비활성화, 새 카드로 잔액 및 포인트 100% 이관 |
| `FEAT-RF-05` | **회원 등급 및 마케팅** | 누적 충전 금액별 브론즈/실버/골드/VIP 등급 부여 및 생일 보너스 쿠폰 발송 |

---

## 3. 데이터 입력 스키마

```typescript
export interface RFMemberCard {
  cardUid: string;              // "04:A3:2B:1C:89:D0"
  memberPhone: string;          // "010-1234-5678"
  memberName?: string;          // 고객명
  carNumber?: string;           // 차량번호
  currentBalance: number;       // 현재 충전 잔액 (원)
  bonusPoints: number;          // 보너스 포인트
  membershipTier: 'bronze' | 'silver' | 'gold' | 'vip';
  status: 'active' | 'suspended' | 'lost' | 'refunded';
  
  registeredAt: string;         // 발급일시
  lastUsedAt: string;           // 최종 결제일시
  
  transactions: Array<{
    txId: string;
    txType: 'charge' | 'use' | 'bonus' | 'refund';
    amount: number;
    balanceAfter: number;
    facilityUsed?: 'touchless_1' | 'touchless_2' | 'vacuum' | 'mat_cleaner';
    timestamp: string;
  }>;
}
```

---

## 4. 회계 및 선수금 관리 로직
- **선수금 부채 관리**: 고객 충전 시 전액 당월 매출로 잡지 않고, **실제 장비에서 차감 사용된 금액만 실현 매출로 회계 처리**하여 세무 건전성 확보
- **휴면 카드 관리**: 최종 사용일로부터 1년 이상 미사용 카드 대상 잔액 안내 알림톡 자동 발송

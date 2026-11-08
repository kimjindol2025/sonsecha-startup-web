# [기획서] 세차장 전문 부동산 앱 (Carwash Real Estate Brokerage App)

> **카테고리**: 05 세차장 거래·부동산 (C급 · 확장)  
> **앱 ID**: `app-estate-brokerage`  
> **목적**: 기존 세차장의 매매, 임대차, 양도양수, 시설권리금 거래를 중개하고, POS 매출 원장 인증 기반의 신뢰할 수 있는 매물 정보를 제공

---

## 1. 서비스 개요 및 타깃
- **대상 사용자**: 
  - 양도 희망 점주 (매도자/임대인): 시설 권리금을 정당하게 인정받고 싶은 점주
  - 인수 희망 창업자 (매수자/임차인): 신규 인허가 위험 없이 이미 검증된 세차장을 인수하려는 투자자
- **핵심 가치**:
  - 가짜 매출 매물 근절: **국세청 홈택스 부가세 증명 및 POS 실매출 인증 배지 부여**
  - 장비 연식, 잔여 임대 계약 기간, 토지 용도, 폐수 정화 방식 등 핵심 자산 명세 공개

---

## 2. 매물 등록 필수 검증 항목

| 검증 항목 | 세부 확인 내용 | 증빙 서류 |
| :--- | :--- | :--- |
| **1. 실매출 검증** | 최근 12개월 월평균 카드/현금 매출액 및 순이익 | VAN사 매출원장, 부가가치세 과세표준증명원 |
| **2. 시설 권리금 산정** | 노터치 장비 감가상각 잔액, 캐노피, 부대설비 원가 | 장비 최초 세금계산서, 설치 계약서 |
| **3. 토지 및 임대차** | 보증금, 월 차임(임대료), 잔여 계약 기간, 재계약 조건 | 부동산 임대차계약서, 등기부등본 |
| **4. 인허가 승계 여부** | 자동차관련시설 용도 유지 여부, 폐수배출시설 명의변경 가능 여부 | 건축물대장, 폐수배출시설 설치신고필증 |

---

## 3. 데이터 스키마

```typescript
export interface CarwashListing {
  listingId: string;            // "EST-202611-001"
  title: string;                // "화성 신도시 3베이 노터치 양도양수"
  dealType: 'transfer_and_lease' | 'property_sale'; // 양도양수 vs 부동산 통매매
  locationArea: string;         // "경기도 화성시" (상세 주소는 비공개 처리)
  bayCount: number;
  monthlyAverageRevenue: number;// 최근 1년 월평균 매출 (예: 3,200만원)
  monthlyAverageProfit: number; // 월평균 순이익 (예: 1,400만원)
  leaseDeposit: number;         // 임차 보증금
  monthlyRent: number;          // 월 임대료
  facilityPremium: number;      // 시설권리금 (예: 2억 5,000만원)
  isRevenueVerified: boolean;   // 매출 공인 인증 여부
  equipmentBrandAndAge: string; // "노터치 O사 2024년식 3대"
  status: 'active' | 'under_contract' | 'closed';
}
```

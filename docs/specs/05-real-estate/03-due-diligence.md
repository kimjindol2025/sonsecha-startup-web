# [기획서] 세차장 인수 실사 앱 (Carwash Acquisition Due Diligence App)

> **카테고리**: 05 세차장 거래·부동산 (C급 · 확장)  
> **앱 ID**: `app-estate-due-diligence`  
> **목적**: 기존 세차장 계약 전 장비 실제 작동 상태, 환경 법적 위반 이력, 공과금 미납금, 지하수 수질, 숨은 부채를 40개 항목 체크리스트로 정밀 실사

---

## 1. 서비스 개요 및 타깃
- **대상 사용자**: 세차장 인수 계약 체결 전 최종 실사를 진행하는 인수 희망자, 공인중개사, 법률 자문
- **핵심 가치**:
  - 인수 직후 장비 폭탄 수리비 발생 방지 (현장 시운전 필수 검수)
  - 전 점주의 환경 과태료, 폐수 무단방류 처분 이력, 상수도 미납금 승계 방어
  - 실사 결과 보고서(PDF) 자동 생성으로 권리금 깎는 객관적 협상 카드로 활용

---

## 2. 4대 실사 체크리스트

| 실사 축 | 필수 점검 항목 | 확인 서류 / 현장 확인 |
| :--- | :--- | :--- |
| **1. 하드웨어/장비 실사** | 노터치 센서 정상 감지, 펌프 100bar 유지, 보일러 누수, 콤프 압력 | 현장 3대 연속 시운전 테스트 |
| **2. 환경 및 법적 실사** | 폐수처리시설 정상 가동, 수질 기준 초과 이력, 위반건축물 등재 여부 | 시청 환경과 행정처분 이력 조회 |
| **3. 공과금 및 재무 실사** | 한전 전기요금, 상수도요금, 가스비 미납 여부 | 완납증명서, 최근 3개월 영수증 |
| **4. 임대차 및 권리 실사** | 건물주 재계약 동의 여부, 근저당 설정액, 제소전화해 조항 | 등기부등본, 제소전화해조서 |

---

## 3. 데이터 스키마

```typescript
export interface DueDiligenceReport {
  targetCarwashName: string;
  auditDate: string;
  auditorName: string;
  
  checklist: Array<{
    category: 'equipment' | 'environmental' | 'financial' | 'legal';
    itemTitle: string;
    passed: boolean;
    severityIfFailed: 'deal_breaker' | 'price_reduction' | 'minor';
    findingNotes: string;
    photoEvidence?: string;
  }>;
  
  overallRiskLevel: 'low_risk' | 'medium_risk' | 'high_risk_do_not_sign';
  suggestedPriceReduction: number; // 발견된 하자로 인한 권리금 감액 제안액
}
```

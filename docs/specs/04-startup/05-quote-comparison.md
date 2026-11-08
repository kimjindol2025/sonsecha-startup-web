# [기획서] 창업 견적 비교 앱 (Equipment & Contractor Quote Comparison App)

> **카테고리**: 04 창업 서비스 (B급 · 수익화)  
> **앱 ID**: `app-startup-quote-compare`  
> **목적**: 장비 제조사(A사, B사, C사) 및 토목·건축 시공업체의 견적서를 항목별로 1:1 대조 분석하여 바가지 견적 및 필수 공정 누락을 방지

---

## 1. 서비스 개요 및 타깃
- **대상 사용자**: 견적서를 받고도 이게 적정한지 불안한 예비 창업자
- **핵심 가치**:
  - 총액만 비교하지 않고 **단위당 단가(콘크리트 헤베당 단가, 펌프 마력당 가격)** 세부 대조
  - 기본 포함 항목 vs 유상 옵션 항목(하부세차 노즐, 온수 순환기, 결제 연동비) 명확한 구분
  - 하자보수 보증기간(1년 vs 2년) 및 AS 출장비 정책 비교

---

## 2. 주요 비교 대조 항목

| 대조 영역 | 핵심 비교 포인트 | 주의사항 / 체크포인트 |
| :--- | :--- | :--- |
| **세차기 하드웨어** | 갠트리 프레임(STS 304 스테인리스 vs 아연도금), 고압 펌프 제조국(독일/이탈리아산 플런저 펌프 vs 중국산) | 내구성 및 녹 발생 차이 |
| **건조 송풍기** | 모터 마력(총 20HP 이상 권장), 블로어 모터 수(3모터 vs 4모터) | 건조 성능 및 소음 데시벨 |
| **수처리(폐수)** | 처리 방식(가압부상식 vs 모래여과식 vs 생물학적), 일일 처리 유량 | 방류수 수질 기준 충족 여부 |
| **토목 기초 공사** | 바닥 철근 배근(D13 복배근 여부), 레미콘 강도(240 이상), 집수정 깊이 | 바닥 균열 및 침하 방지 |
| **사후 관리 (A/S)** | 무상 보증 기간, 관할 A/S 지점 거리, 24시간 원격 대응 여부 | 주말 고장 시 출동 시간 |

---

## 3. 데이터 스키마

```typescript
export interface QuoteComparisonSheet {
  sheetId: string;
  createdDate: string;
  vendors: Array<{
    vendorName: string;         // "A 머시너리", "B 이노베이션"
    totalQuotePrice: number;    // 총 견적 금액
    machineSpecs: {
      pumpBrand: string;        // 예: "이탈리아 하이프로"
      motorHp: number;          // 송풍 마력
      frameMaterial: string;    // "STS 304"
      touchlessWarrantyYears: number; // 무상 보증 년수
    };
    includedFreeOptions: string[];// 무상 포함 옵션 (예: 하부노즐, 결제연동)
    paidOptionsCost: number;    // 유상 옵션 추가금
    paymentTerms: string;       // 계약금 30%, 중도금 50%, 잔금 20%
    overallScore: number;       // 가성비/신뢰도 평가 점수 (100점 만점)
  }>;
}
```

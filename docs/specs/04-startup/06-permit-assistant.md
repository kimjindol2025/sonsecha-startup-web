# [기획서] 인허가 도우미 앱 (Permits & Regulatory Assistant App)

> **카테고리**: 04 창업 서비스 (B급 · 수익화)  
> **앱 ID**: `app-startup-permit-helper`  
> **목적**: 개발행위허가, 건축허가(용도변경), 폐수배출시설 설치신고, 도로점용허가, 소방시설 완비 등 지역별 인허가 준비 서류와 관공서 민원 절차를 단계별 지원

---

## 1. 서비스 개요 및 타깃
- **대상 사용자**: 세차장 창업자, 인허가 대행 건축사사무소, 행정사
- **핵심 가치**:
  - 세차장은 건축법상 **"자동차 관련 시설(세차장)"**으로 용도가 지정되어야 영업 가능
  - 용도지역(제2종 일반주거, 자연녹지, 계획관리지역) 조례별 건축 가능 여부 자동 판별
  - 관할 지자체 담당 부서(건축과, 환경과, 하수도과, 도로과) 제출 서류 표준 양식 제공

---

## 2. 5대 필수 인허가 단계 및 준비 서류

| 인허가 단계 | 관할 부서 | 필수 제출 서류 | 소요 기간 |
| :--- | :--- | :--- | :---: |
| **1. 건축/용도변경 허가** | 시·군·구청 건축과 | 건축물대장, 설계도면, 구조안전확인서, 주차장 계획도 | 14 ~ 30일 |
| **2. 개발행위허가** | 도시계획과 | 토지이용계획확인서, 토목설계도, 피해방지계획서 | 15 ~ 30일 |
| **3. 폐수배출시설 설치신고** | 환경과 (환경지도과) | 폐수배출시설 설치신고서, 수질오염방지시설 설계도서, 원료 및 용수 사용량 명세서 | 10일 |
| **4. 도로점용/연결허가** | 도로과 / 국토관리청 | 점용구역 평면도, 교통안전대책, 도로 굴착 및 복구 계획서 | 14일 |
| **5. 사업자등록 & 영업개시** | 관할 세무서 | 영업허가(신고) 필증, 임대차계약서, 신분증 | 당일 즉시 |

---

## 3. 데이터 스키마

```typescript
export interface PermitWorkflowTracker {
  caseId: string;
  propertyAddress: string;
  zoningDistrict: string;       // "제2종 일반주거지역"
  isAutomobileFacility: boolean;// 자동차관련시설 용도 여부
  
  stages: {
    buildingPermit: { status: 'submitted' | 'under_review' | 'approved'; officialDocNo?: string };
    wastewaterFiling: { status: 'submitted' | 'under_review' | 'approved'; approvedCapacityM3: number };
    roadOccupation: { status: 'exempt' | 'applied' | 'approved' };
  };
  
  assignedArchitect: {
    firmName: string;
    contact: string;
  };
  
  documentVault: Array<{
    docTitle: string;
    submittedDate: string;
    fileUrl: string;
  }>;
}
```

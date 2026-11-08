# 세차장 통합 운영관리 시스템 (Integrated Operations Management) PRD

> **문서 버전**: v1.0.0  
> **최종 수정일**: 2026-11-08  
> **상태**: 승인 및 개발 준비 (Approved for Implementation)  
> **연결 웹 기획서**: `carwash-operations-plan.html`  
> **관련 리포지토리**: `kimjindol2025/sonsecha-startup-web`

---

## 1. 프로젝트 개요

### 1.1 배경 및 문제 정의
현재 노터치 자동세차 및 셀프세차장 운영 현장은 여러 도구가 파편화되어 있습니다:
- **매출**: 키오스크 밴사 관리자 페이지 또는 포스기 별도 조회
- **법정 환경 관리**: 물환경보전법 제38조의2에 따른 '폐수배출시설 운영일지'를 수기로 작성하거나 방치하여 불시 단속 시 과태료(최대 300만원) 및 영업정지 위험 상존
- **장비 유지보수**: 고장 발생 시 카카오톡/전화로 산발적 소통, 부품 교체 주기 및 가동 중단(Downtime) 비용 미파악
- **약품 및 재고**: 스노우폼, 발수코팅제 등 필수 케미컬의 잔량을 눈대중으로 파악하다 세차 중단 사태 발생
- **고객 클레임**: 도장 스크래치 분쟁 발생 시 사전 점검 기록 및 CCTV 확인 이력 부재로 보상 분쟁 빈발

### 1.2 서비스 목표
**"점주의 일일 마감 소요 시간을 1시간에서 5분으로 단축하고, 법적 리스크와 장비 셧다운을 선제 방어하는 원스톱 통합 운영관리 화면 구축"**

---

## 2. 6대 핵심 관리 축 및 기능 요구사항

### F-01. 통합 매출·결제 관리 (Sales & Revenue)
- **일일 매출 집계**: 세차 코스별(기본, 하부, 프리미엄 등) 판매량 및 결제 수단별(신용카드, RF카드 충전, 간편결제, 현금) 매출 기록
- **운영 지표 자동 산출**: 총 방문 차량 수, 대당 평균 객단가(ATV), 베이별 회전율
- **이상 징후 감지**: 특정 베이의 매출이 0원이거나 주말 피크타임 매출 급감 시 알림 표시

### F-02. 장비·설비 & AS 관리 (Equipment & IoT)
- **주요 설비 관리**: 노터치 갠트리 1/2호기, 초고압 펌프, 블로어(건조기), 콤프레셔, 동파방지 보일러
- **가동 모니터링**: 누적 가동시간, 고장 정지시간(Downtime), 에러코드 이력 기록
- **예방 정비(PM)**: 오일 교체 주기, 노즐 스케일링, 벨트 장력 점검 알림 (D-Day 표시)
- **AS 접수 대장**: 고장 증상, 담당 엔지니어, 출장일자, 부품 교체 내역, 수리비 관리

### F-03. 직원 & 교대/정산 관리 (Staff & Shifts)
- **교대 근무 체크**: 오픈/주간/마감/야간 무인 전환별 근무자 지정
- **필수 이행 점검표**: 드라잉존 청소, 타월 수거/세탁, 쓰레기 분리배출, 화장실 위생
- **마감 시재 정산**: 키오스크 현금 실사액 vs 시스템 기록 대조, 시재 차액 기록

### F-04. 고객 & 민원/CS 관리 (Customer & Incidents)
- **차량 클레임 대장**: 차량번호, 차종, 사고 유형(스크래치 주장, 휠 손상, 세척 불만 등)
- **증빙 관리**: 입차 전 스크래치 사진, CCTV 영상 확인 여부, 안내문 고지 이행 기록
- **처리 결과**: 환불, 무료 재세차 쿠폰 지급, 보험 접수 등 조치 상태 추적

### F-05. 소모품 & 재고 자동 추산 (Inventory & Chemicals)
- **핵심 케미컬 관리**: 프리워시(알칼리), 스노우폼, 휠클리너, 발수코팅제, 유리막 코팅제
- **소진율 추정**: 세차 차량 수에 비례하여 약품 소진량 자동 추정
- **안전재고 경고**: 최소 유지 수량 미달 시 '발주 필요' 경고 배지 표출

### F-06. 법정 환경(폐수) 운영기록부 (Compliance) ★법적 필수
- **물환경보전법 제38조의2 준수**:
  - 일일 상수도/지하수 계량기 지침 및 일 사용량(㎥)
  - 일일 폐수 발생량 및 처리량(㎥)
  - 수질오염방지시설 가동 시간 및 전력 적산계(kWh) 지침
  - 약품 투입량(응집제, pH조절제 등 kg/L)
  - 슬러지 발생/보관량 및 위탁 수거업체 인계 기록
- **출력 기능**: 지자체 환경과 불시 단속 시 원클릭 '법정 운영기록부 양식' 인쇄 및 PDF 저장

---

## 3. UI/UX 화면 설계

### S-01. 통합 운영 대시보드 홈 (Unified Dashboard)
1. **헤더 지표 카드 (KPI Cards)**:
   - 오늘 순매출 (전일/전주 대비 증감)
   - 오늘 방문 차량수 & 평균 객단가
   - 운영 베이 상태 (정상 가동 / 점검 중)
   - 긴급 알림 배지 (재고 부족 N건, AS 대기 N건, 폐수 주의 N건)
2. **빠른 실행 버튼**:
   - `[+ 오늘 운영 마감하기]` (모달 또는 5분 퀵 폼 호출)
   - `[환경부 일지 출력]`
3. **분야별 종합 현황 탭 / 그리드**:
   - 매출 현황 요약
   - 장비 상태 및 정비 예정 캘린더
   - 약품 재고 잔여 바
   - 미해결 민원/AS 목록

### S-02. 일일 5분 통합 마감 모달 (Daily Closing Wizard)
퇴근 전 5단계 순차 입력:
- Step 1: 기본 정보 (날짜, 날씨, 작성자)
- Step 2: 매출 및 차량수 (코스별 대수, 총매출액)
- Step 3: 장비 상태 체크 (이상 발생 장비 및 정지시간)
- Step 4: 환경 계량기 입력 (수도 지침, 폐수 상태)
- Step 5: 약품 보충 및 특이사항 (소진 약품 체크, 고객 민원 메모)

---

## 4. 데이터 스키마 설계

```typescript
export interface DailyOperationClosing {
  id: string; // YYYY-MM-DD
  date: string;
  weather: 'sunny' | 'cloudy' | 'rain' | 'snow';
  manager: string;
  
  // 1. 매출
  sales: {
    totalRevenue: number;
    totalCars: number;
    courseBreakdown: { courseName: string; count: number; price: number }[];
    paymentChannels: { channel: string; amount: number }[];
    refundAmount: number;
  };
  
  // 2. 장비
  equipment: {
    downtimeMinutes: number;
    issueReported: boolean;
    issues: { equipmentName: string; symptom: string; status: 'reported' | 'in_repair' | 'resolved' }[];
  };
  
  // 3. 환경 (폐수)
  compliance: {
    waterMeterStart: number;
    waterMeterEnd: number;
    waterUsage: number; // L or m3
    wastewaterTreated: number;
    powerMeterKwh: number;
    sludgeAmountKg: number;
    chemicalInjectedKg: number;
    oilSeparatorCleaned: boolean;
    status: 'normal' | 'caution' | 'action_required';
  };
  
  // 4. 재고
  inventory: {
    replenishedItems: { itemName: string; quantity: number }[];
    lowStockAlerts: string[];
  };
  
  // 5. CS & 특이사항
  incidents: {
    complaintCount: number;
    notes: string;
  };
  
  createdAt: string;
  updatedAt: string;
}
```

---

## 5. 단계별 개발 및 배포 일정

1. **Phase 1 (기획서 웹 배포 & 카탈로그 연결)**:
   - 기획서 웹 페이지(`carwash-operations-plan.html`) 제작 및 GitHub Pages 배포
   - 카탈로그(`carwash-app-catalog.html`) 카드 링크 업데이트 (`기획서 보기 →`)
2. **Phase 2 (통합 일일 마감 앱 프로토타입 구현)**:
   - `operations-apps.js` 또는 전용 스크립트에 통합 스키마 구현
   - 5분 일일 마감 폼 및 대시보드 화면 렌더링
3. **Phase 3 (법정 서류 출력 & 자동화)**:
   - 환경부 폐수운영기록부 A4 인쇄 스타일시트 연계
   - 이상 징후 자동 분석 엔진 탑재

# 세차장 예방정비 구현 명세 v1.0

> 조사 초안: [03-preventive-maintenance.md](./03-preventive-maintenance.md)  
> 구현 대상: OEM 일정이 아닌 명시적인 데모 일정으로 계획/작업/이력 흐름을 검증하는 브라우저 MVP

## 0. 고정 범위

- 기존 저장소의 Vite/JavaScript/CSS만 사용하며 새 패키지/프레임워크를 추가하지 않는다.
- 진입 페이지 `preventive-maintenance-app.html`; 코드 `src/preventive-maintenance.js`, `src/preventive-maintenance.css`.
- `데모 데이터 · 실제 정비 기준 미연결` 고지를 항상 표시한다.
- 합성 지점·장비·템플릿·정비 작업만 제공한다. 각 seed 작업의 주기는 데모 화면 작동을 위한 임의 값이며 제조사 권장, 법정 검사, 안전 절차가 아니다.
- 실제 사용자가 관리하는 계획은 출처 문서/개정판을 등록해야 `근거 확인` 상태가 될 수 있다. 출처가 없는 데모 템플릿은 `데모·근거 미확인`으로 표시한다.
- 실제 로그인·다중 사용자 권한·서버 동기화·자동 계량 수집·알림 전송·부품 재고 차감·AS 업체 발주를 구현하지 않는다.
- 앱은 안전 작업이나 자격을 판정하지 않는다. 범용 위험 작업 절차를 추천하지 않는다.

카탈로그의 예방정비 카드에서 이 명세로 이동한다. 기존 장비 점검 앱과 파일을 수정하지 않는다.

## 1. 사용자 작업

현장 관리자는 가상 장비의 기한이 된 정비를 발견해 작업을 기록하고, 다음 예정 시점을 생성한다.

1. 요약에서 예정/오늘/연체/진행 중 작업을 확인한다.
2. 지점·장비·기한 상태로 계획/작업을 좁힌다.
3. 제조사 기준이 등록된 계획은 문서 제목/버전/유효일/링크를 확인하고, 데모 또는 미확인 일정은 별도 배지를 확인한다.
4. 작업을 시작하고 담당자와 작업 체크 항목을 기록한다.
5. 작업을 완료하며 결과, 소요 시간, 교체 부품(자유입력 텍스트), 정지시간, 다음 기한을 남긴다.
6. 연기가 필요하면 사유와 요청자/확인자 이름을 남기며, 다음 예정 계산은 승인 후에만 변경한다.

## 2. 페이지 구성

### 공통 상단

제목 `예방정비`; 설명 `정비 계획과 완료 이력을 기록하는 데모입니다.`; 배지 `데모 데이터 · 실제 정비 기준 미연결`; 카탈로그 링크 `./carwash-app-catalog.html`.

### 대시보드

- KPI: 오늘 기한, 7일 이내, 연체, 진행 중.
- 예정 작업 테이블: 기한, 지점, 장비, 작업명, 주기, 근거 상태, 담당, 상태.
- 정렬: 연체 우선, 기한 오래된 순, 같은 날짜면 지점/장비명 순.
- 필터: 지점, 장비, 작업 상태, 근거 상태, 이름 검색. 기본은 모든 지점·미완료 작업.
- 모바일에서는 행을 카드로 바꾸고 작업 상태/기한을 첫 화면에 둔다.

### 계획 등록/편집

필수: 지점, 장비, 작업명(3~80자), 주기 방식(`달력 일수`만 v1), 주기(1~3650일 정수), 다음 기한(날짜), 담당자.  
선택: 작업 설명(최대 1000자), 작업 체크항목(각 1~120자, 최대 20개), 근거 문서명/버전/유효일/HTTPS URL, 메모.

- 근거 필드가 완성되면 `출처 등록(현장 승인 전)` 상태. URL은 HTTPS만 허용하고 자동으로 내용을 검증했다고 표시하지 않는다.
- 근거가 없는 계획은 `기준 미확인` 배지를 갖고 저장 직전에 데모 앱의 일정은 권장 주기가 아니라는 안내를 보인다.
- OEM 권장 주기를 화면에서 자동 추천하거나 모델명으로 추정하지 않는다.
- 계획을 보관 처리할 수 있지만 이미 생성된 작업 이력은 삭제하지 않는다.

### 작업 상세/완료

- 상태: `예정 → 진행 중 → 완료` 또는 `예정/진행 중 → 취소`. 임의로 완료에서 되돌리기 금지.
- 작업 시작 시 작업자 이름 2~40자 필수. 체크항목은 입력자가 저장한 계획 기준만 보여준다. 앱이 안전 체크항목을 만들어 넣지 않는다.
- 완료 필드: 결과(필수 3~1000자), 작업 종료시각(기본 현재 한국 시간), 소요시간(0~1440분 정수, 선택), 정지시간(0~1440분 정수, 선택), 사용 부품(품명/수량/단위, 최대 20줄, 재고 차감 아님), 증빙 메모(선택 최대 500자).
- 계획에 유효한 주기가 있으면 완료일+주기일을 다음 기한으로 제안한다. 저장 전에 사용자가 확인한다. 이 계산은 등록한 데모 주기의 산술 결과일 뿐 OEM 권장 검증을 의미하지 않는다.
- 첨부 사진 업로드는 v1 미지원. 가짜 파일 버튼을 만들지 않는다.

### 연기

연기 사유 5~500자와 요청자 이름이 필요하다. 확인자 이름 입력 뒤 `확인`을 눌러야 새 날짜가 저장된다. 거절/취소 시 기존 날짜는 보존한다. 작업 이력에 이전 기한, 새 기한, 사유, 요청자, 확인자, 시각을 남긴다. `연기`는 법정 또는 제조사 기한을 자동 변경하지 않는 데모 기록임을 명시한다.

## 3. 일정 계산과 상태 규칙

한국 시간(`Asia/Seoul`) 기준 오늘 날짜를 사용한다. UTC 자르기로 일자 차이를 계산하지 않는다.

- 계획 날짜 없음: `기한 미설정` 및 `기준 미확인`.
- 기한 < 오늘: `연체`.
- 기한 = 오늘: `오늘`.
- 기한이 내일부터 7일 이내: `7일 이내`.
- 그 이후: `예정`.
- 완료/취소된 작업은 미완료 KPI에서 제외하고 이력 화면에 남긴다.
- 날짜가 잘못되었거나 저장 불가면 상태를 임의 추론하지 않고 입력 오류를 표시한다.
- 앱은 운전시간 계량을 읽거나 시간기준 다음 정비를 산출하지 않는다. `달력 일수` 외 interval 단위를 노출하지 않는다.

## 4. 데모 seed

가상 지점 2곳, 장비 4대, 정비 계획 5개, 작업 6개를 만든다. 날짜는 페이지 진입일에서 상대 계산해 오늘/7일 이내/연체/예정 상태가 항상 보이게 한다. 가상 작업 예시는 `필터 점검`, `노즐 상태 확인`, `정기 윤활 점검`이며 모든 seed 템플릿에 `데모 일정 · OEM 기준 아님`을 붙인다. 가상 제조사와 모델명은 실제 상표와 혼동되지 않게 `샘플 제조사`, `DEMO-01` 식별자를 쓴다. 사용자에게 실제 정비를 지시하지 않는다는 안내를 작업 예시 근처에 둔다.

## 5. 데이터 계약

Storage key `sonsecha.preventive-maintenance.demo.v1`, envelope `schemaVersion: 1`.

```ts
type WorkStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
type BasisStatus = 'demo_unverified' | 'source_entered_pending_review' | 'approved_by_operator';
interface MaintenancePlan {
  id: string; siteId: string; equipmentId: string; title: string; description: string;
  intervalDays: number; nextDueDate: string; owner: string; checklist: string[];
  basisStatus: BasisStatus; sourceTitle: string; sourceVersion: string;
  sourceValidDate: string | null; sourceUrl: string; archivedAt: string | null;
}
interface WorkOrder {
  id: string; planId: string; siteId: string; equipmentId: string; dueDate: string;
  status: WorkStatus; assignee: string; startedAt: string | null; completedAt: string | null;
  result: string; durationMinutes: number | null; downtimeMinutes: number | null;
  partsUsed: Array<{ name: string; quantity: number; unit: string }>;
  statusHistory: Array<{ from: WorkStatus | null; to: WorkStatus; by: string; at: string }>;
}
interface Deferral {
  id: string; workOrderId: string; oldDueDate: string; proposedDueDate: string;
  reason: string; requester: string; approver: string; approvedAt: string;
}
```

모든 시각은 UTC ISO 8601로 저장, 화면은 `Asia/Seoul`로 표시한다. 실제 부품재고나 계량값이 없다는 점을 데이터와 UI에서 숨기지 않는다. 계획 템플릿의 출처와 적용 모델/유효일을 보존한다.

화면은 `demoMaintenanceAdapter`를 통해 데이터에 접근한다: `listPlans(filters)`, `listWorkOrders(filters)`, `getWorkOrder(id)`, `createPlan(input)`, `updatePlan(input)`, `startWork(input)`, `completeWork(input)`, `requestDeferral(input)`, `approveDeferral(input)`, `cancelWork(input)`, `archivePlan(id)`, `resetDemo()`, `exportSnapshot()`. 모든 메서드는 Promise를 반환하고 `localStorage` 접근은 어댑터 안에 둔다.

## 6. 저장/오류/보안/접근성

- 모든 임의 입력은 길이/타입 검사 후 HTML escape한다. 사용자 입력을 raw `innerHTML`에 넣지 않는다.
- 이미 완료/취소된 작업 전이는 거부한다. 완료 작업 중복 제출은 버튼 잠금과 동일 idempotency key로 막는다.
- localStorage 손상/스키마 버전 불일치 때 원문을 화면에 노출하지 않고 복구 안내와 데모 재초기화를 제공한다. 저장 실패 시 완료 토스트를 표시하지 않는다.
- 사진 첨부, 고객 개인정보, 실주소, 자격증 번호, 장비 비밀번호를 입력받지 않는다.
- 대화상자는 label, 오류 위치 안내, 키보드 포커스 이동·복귀, Escape를 지원한다.
- 상태 배지는 텍스트+아이콘을 함께 사용. 360px에서 가로 스크롤 없이 주요 작업 가능해야 한다.
- `prefers-reduced-motion` 준수.

## 7. 인수 기준

- [ ] 카탈로그 카드가 이 구현 명세로 연결된다.
- [ ] 데모/기준 미연결 안내가 항시 확인 가능하다.
- [ ] 계획 등록에서 출처 미확인과 출처 입력 상태를 구분한다.
- [ ] 오늘/7일 이내/연체/예정 및 정렬/필터가 한국 날짜 기준으로 정확히 동작한다.
- [ ] 작업 예정→진행→완료, 취소, 승인된 연기 흐름과 상태 이력이 보존된다.
- [ ] 완료 후 다음 기한 계산은 사용자가 확인하며 OEM 검증 문구로 오인되지 않는다.
- [ ] 부품 사용은 이력만 기록하고 재고 차감은 일어나지 않는다.
- [ ] 재로드 후 계획/작업/연기가 남고 초기화와 JSON 내보내기가 동작한다.
- [ ] 360px, 키보드, 빈 상태, 잘못된 입력, 저장 실패를 확인한다.
- [ ] `npm run build` 성공 및 `dist/preventive-maintenance-app.html` 생성.
- [ ] 실제 장비 통신, 자동 알림, 안전 판단, 계량값 수집 코드가 없다.

## 8. 후속 실운영 입력

우선 모델별 OEM 매뉴얼 원본/개정/적용 조건, 현장 안전 절차와 자격 조건, 정비 책임/연기 승인자, 실제 부품 품번 및 재고 연동 소유자, 운전시간 카운터 출처·정확도, 사진 보존·접근권한, 지점별 데이터 권한, 운영 백업/감사/알림 채널이 필요하다. 제조사 문서 등록만으로 업무 절차가 승인된 것으로 간주하지 않는다.

## 9. 근거와 적용 한계

- [Cat Pumps 3570 Series Service Manual](https://www.catpumps.com/sites/default/files/2023-01/99MAN010A%20_3570_LoR.pdf) 및 [25PFR Service Manual](https://www.catpumps.com/sites/default/files/products/pdfs/25FRSvc%281%29.pdf): 펌프 모델별 점검/정비 예시. 타 장비나 세차장 전체의 주기로 일반화하지 않는다.
- [Kärcher maintenance packages](https://www.kaercher.com/ge/sales-service/service/maintenance-packages.html): 제조사 서비스 항목의 예시이며 세차장 전체의 주기/안전기준이 아니다.
- [ISO 17359:2018](https://www.iso.org/standard/71194.html): 기계 상태감시 프로그램의 일반 지침 참고.

위 자료는 특정 세차장 장비의 적용 기준이나 인증/법률 검토를 대신하지 않는다. 자료 확인일: 2026-11-09.

# 장비 설치 프로젝트 관리 구현 명세 v1.0

> 조사 초안: [04-equipment-installation-project.md](./04-equipment-installation-project.md)  
> MVP: 단계/게이트/일정/결정 기록을 연습하는 **가상 프로젝트 데모**  
> 실제 공사·허가·계약·안전 승인 시스템은 아니다.

## 0. 고정 구현 결정

- 진입 `equipment-installation-project-app.html`; 코드 `src/equipment-installation-project.js`, `src/equipment-installation-project.css`; Vite/Vanilla JS/CSS.
- 상시 표시 `프로젝트 데모 · 실제 공사/허가/안전 승인 아님`.
- 1개 가상 프로젝트, 가상 참여자/장비/문서 메타데이터만 포함. 가상 문서를 실제 원본 파일처럼 보여주지 않는다.
- 앱은 일정/기록 UX만 다룬다. 법적 허가/신고 대상 여부, 건축/배수/폐수/전기 검사, 안전 적합성, 계약 분류를 판정하지 않는다.
- 문서 첨부/전자서명/결재, 실제 업체 알림, 예산 지불, 클라우드 문서 저장, 지도/GPS, 시공일지 사진은 구현하지 않는다.
- 데모 역할(`본사 PM`, `발주자`, `시공사`)은 화면 미리보기 값일 뿐 접근 제어가 아니다.
- 로컬 저장만 제공. 공개 웹에서 쓰면 안 되는 실주소, 실계약금액, 개인 연락처, 실제 도면/계약 파일을 받지 않는다.

## 1. 완료 사용자 흐름

PM 데모 사용자가 프로젝트 목록에서 1개 가상 프로젝트를 열고 7단계별 진행을 보며, 담당자를 정하고 문서 메타데이터/결정 기록을 작성하고, 변경요청을 검토하고, 인수 체크 완료 기록을 남기는 과정을 수행한다.

1. 프로젝트 요약/현재 단계/예정 지연/미처리 이슈를 본다.
2. 단계별 체크리스트에서 책임자와 완료 정보를 기록한다.
3. gate 필수 항목이 빠졌다면 다음 단계 전환이 차단되고 누락 항목이 표시된다.
4. 문서 메타데이터를 새 버전으로 등록하고 이전 버전과 비교한다.
5. 변경요청을 접수·승인/반려하고 비용/일정 영향은 `데모 기록`으로 남긴다. 금액 지급은 없다.
6. 시운전 및 인수 체크리스트를 기록하되 합격/법정 검사 통과를 앱이 판정하지 않는다.

## 2. 화면 상세

### 프로젝트 홈

제목 `장비 설치 프로젝트`; 고정 데모 배지; 카탈로그 복귀. KPI `현재 단계`, `전체 체크 항목 진행`, `기한 지난 작업`, `미결 이슈`. KPI는 가상 데이터에서만 계산.

프로젝트 표: 데모 코드, 가상명, 가상 지역(시/도 표시만), 시작/목표 날짜, 현재 gate, 상태. 프로젝트 1개만 제공.

### 7단계 timeline

1. 부지/요구 검토
2. 범위/계약 기준 기록
3. 설계/인허가 검토 기록
4. 장비/BOM 조달 기록
5. 공사/설치 일지
6. 시운전/시험 기록
7. 인수/종결

각 단계는 `대기`, `진행 중`, `검토 요청`, `보완 필요`, `데모 통과 기록됨` 중 하나. 단계 변경 이력에 담당자 표시명, 메모, 시각을 append한다. 단계 순서는 고정. 다음 단계는 해당 단계의 required checklist가 완료되고 `검토 요청→데모 통과 기록됨` 상태일 때만 열 수 있다. `데모 통과 기록됨`은 실제 전문/법정 승인 아님을 모든 단계에 표시.

### 단계 checklist 예시(입력 기록용)

- 1: 발주/운영 담당자 입력, 부지 검토 메모, 유틸리티 확인 책임자 지정
- 2: 범위 기준 버전 등록, 참여 공종 입력, 일정/예산 책임자 기록
- 3: 도면 메타데이터 버전 입력, 인허가 해당 여부 `확인됨/검토 중/해당 없음 판단근거 기록` 중 선택, 검토자/메모 입력
- 4: 장비 BOM 버전 등록, 모델/수량 기록, 납기 상태 입력
- 5: 최근 현장 일지 1건, 미결 이슈 소유자/기한 지정
- 6: 시험 시나리오 버전, 수행자, 결과 기록(합격 문구는 사용자가 입력한 데모 text 그대로)
- 7: 인수 항목 체크, 매뉴얼/보증 문서 메타데이터 확인, 인수 확인자/일시 기록

위 항목은 일정 관리 데모용 체크 항목일 뿐 법정 업무/검사/안전 checklist가 아니다. `인허가 해당 없음`도 화면이 자동 추천하지 않는다. 사용자가 판단 메모와 책임자를 직접 기록해야 한다.

### 문서 등록

필수: 문서 제목 3~100자, 유형(`도면 메타데이터/승인 기록/매뉴얼/BOM/시험 기록/기타`), revision 1~30자, 작성자 표시명, 기록 날짜. 선택: 발행일/유효일, 이전 문서 ID, 메모 최대 1000자, 외부 참조 URL(HTTPS만). 파일/첨부는 없음. 새 버전은 append-only, 기존 revision 수정/삭제 금지. URL은 클릭 시 경고를 띄우고 새 탭에서 열며 자동 검증된 출처라고 표현하지 않는다.

### 이슈와 변경요청

- 이슈 필드: 제목(3~100), 단계, 설명(10~1000), 영향(`일정/범위/문서/시험/미분류`), 담당자, 목표일, 상태(`열림/검토중/대기/종결 기록`). 상태 종결은 사유 메모 필수.
- 변경요청: 변경 전/후 설명(각 10~500), 요청자, 이유, 영향예상(`기간 증감일`, `데모 비용 증감 원` 선택), 연결 단계/문서 revision, 상태(`요청/검토중/승인 기록/반려 기록`). 승인자/결정 메모 필수. 값은 가정 데이터이며 실제 견적/예산/계약 변경 아님.

### 인수 기록

7단계에 도달하면 가상 인수 항목의 확인란을 제공한다: `설비 목록 입력`, `문서 revision 입력`, `잔여 이슈 담당자 지정`, `인수 확인 기록`. 체크는 운영상 인수 완료/법정 준공/검사 합격을 증명하지 않는다는 고지를 옆에 둔다.

## 3. 일정 및 gate 규칙

- 모든 목표일은 한국 날짜로 저장/표시한다. 시각 이벤트는 ISO UTC.
- 현재 단계의 필수 checklist 100%와 PM demo 검토자 이름/메모가 있어야 gate를 통과한다.
- 미결 이슈가 있다는 이유만으로 gate 자동 통과/차단하지 않는다. 수동으로 미해결 이슈의 owner/due date 기록을 요구.
- 변경 승인 시 기준 일정/예산을 조용히 덮어쓰지 않는다. old/new 값을 변경 이력에 저장하고 프로젝트 타임라인에 표시.
- 날짜/비용 누락은 `0`으로 간주하지 않는다. 입력되지 않은 값은 `미기록`.
- 지연 KPI는 목표일이 오늘보다 이전이며 상태가 `완료 기록`이 아닐 때 1건. 법적 기한/허가 만료 알림은 제공하지 않는다.

## 4. 고정 seed 및 데이터 모델

가상 `DEMO-PROJ-001`, 지역 `충청 데모 지역`, 가상 세차장 1개, 7단계, 문서 meta 5건, issue 3건, change request 2건, 6명의 가상 담당자를 seed한다. 일부 단계는 진행 중/보완 필요로 표시한다. 모든 값은 가상.

localStorage `sonsecha.installation-project.demo.v1`, `schemaVersion: 1`.

```ts
type PhaseStatus = 'not_started'|'in_progress'|'review_requested'|'needs_revision'|'demo_approved';
interface Project { id: string; code: string; name: string; regionLabel: string; startDate: string; targetDate: string; currentPhaseId: string; status: 'active'|'demo_closed' }
interface Phase { id: string; projectId: string; order: number; title: string; status: PhaseStatus; checklist: Array<{ id: string; label: string; required: boolean; completedAt: string|null; actor: string; note: string }> }
interface DocumentMeta { id: string; projectId: string; phaseId: string; title: string; type: string; revision: string; issueDate: string|null; validUntil: string|null; previousId: string|null; referenceUrl: string; note: string; createdAt: string; createdBy: string }
interface Issue { id: string; phaseId: string; title: string; description: string; impact: string; owner: string; dueDate: string|null; status: string; statusHistory: Array<{status:string;at:string;actor:string;note:string}> }
interface ChangeRequest { id: string; phaseId: string; before: string; after: string; reason: string; daysDelta: number|null; demoCostDeltaWon: number|null; status: 'requested'|'reviewing'|'approved_demo'|'rejected_demo'; decisionBy: string|null; decisionNote: string; events: Array<{from: 'requested'|'reviewing'|'approved_demo'|'rejected_demo'|null; to: 'requested'|'reviewing'|'approved_demo'|'rejected_demo'; at: string; actor: string; note: string}> }
```

UI는 `demoProjectAdapter` 사용: `getProject(id)`, `listPhases(id)`, `updateChecklist(input)`, `requestPhaseReview(input)`, `approveDemoGate(input)`, `createDocumentMeta(input)`, `createIssue(input)`, `transitionIssue(input)`, `createChangeRequest(input)`, `decideChangeRequest(input)`, `resetDemo()`, `exportSnapshot()`. 모든 함수 Promise 기반, 외부 문서/공사 시스템 호출 없음.

## 5. 오류/보안/접근성

- 모든 입력은 trim/길이/숫자/날짜 검증 뒤 escape. URL은 HTTPS 검증. raw user HTML 금지.
- localStorage 손상/저장 실패 시 복구 메시지와 JSON export 제공. 성공 기록을 하지 않는다.
- 동일 gate 통과, 동일 문서 ID, 반복 버튼 제출을 차단한다.
- 승인/보완/반려는 사유와 actor 필수; 기존 승인 기록 편집 불가.
- 파일 업로드가 없으므로 실제 도면/계약/주소 입력 금지 안내를 보인다.
- 체크 상태는 텍스트 및 체크 표시, 색상만으로 의미 전달 금지. 키보드 접근, label, focus, 360px 반응형, reduced motion 지원.
- JSON `sonsecha-installation-project-demo-YYYY-MM-DD.json` 다운로드 및 초기화 전 확인.

## 6. 인수 기준

- [ ] 카탈로그 구현 명세 링크 및 앱 진입/복귀.
- [ ] 합성 데이터/법적·기술 승인 아님 고지.
- [ ] 7단계 순서, 체크 항목, gate 차단/통과 규칙과 현 단계가 일치.
- [ ] 문서 버전 append-only, 이전 revision 연결, URL 메타데이터 동작.
- [ ] issue owner/due, 변경 전후/영향/결정 사유가 타임라인에 보존.
- [ ] 입력하지 않은 금액/날짜를 0 또는 정상값으로 표시하지 않는다.
- [ ] 인수 확인이 법적 준공/검사 합격 의미가 아님이 보인다.
- [ ] 재로드 보존, 초기화/export, 오류/모바일/키보드 확인.
- [ ] `npm run build` 성공 및 `dist/equipment-installation-project-app.html` 생성.
- [ ] 허가 판정/전자 서명/외부 결재/실제 프로젝트 파일 저장/알림/계약결제가 없다.

## 7. 실프로젝트 적용 입력

부지/공사 유형별 담당 전문가, 적용 공종/계약/허가/검사 판정 책임자, 단계별 계약상 승인권자, 기준 일정·대금·변경·하자·인수 조건, 실제 도면/서명 저장소와 권한, 문서 보유기간, 업체 사용자 관리, 사진/개인정보, 폐수·전기·건축·안전 검토자, 실제 시험의 합격기준을 확정해야 한다. 법령 문구를 checklist에 자동 적용하기 전에 전문가 검토와 버전 관리가 필요하다.

## 8. 근거와 한계

- [건설산업기본법 제22조](https://www.law.go.kr/lsSideInfoP.do?docCls=jo&joBrNo=03&joNo=0022&lsiSeq=273435&urlMode=lsScJoRltInfoR), [건축법 변경/사용승인 조항](https://www.law.go.kr/lsLinkCommonInfo.do?lsJoLnkSeq=1032219315): 계약·부지·공사 유형별 법률 검토 경로 참고.
- [물환경보전법 제33조](https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1032122911), [전기안전관리법](https://law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1029922441): 폐수/전기 설비 적용 범위는 구체 사업과 설비 조건에 따라 확인한다.
- [Microsoft Project timeline and task dependencies](https://support.microsoft.com/en-us/project/how-project-schedules-tasks-behind-the-scenes): 일정/선후행 관계 UI 사례.

위 출처는 개별 프로젝트 허가/검사 대상을 판정하거나 이 데모 체크리스트의 법적 완전성을 입증하지 않는다. 자료 확인일: 2026-11-09.

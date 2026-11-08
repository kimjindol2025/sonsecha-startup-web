# 세차장 리뷰 관리 구현 명세 v1.0

> 조사 초안: [03-review-management.md](./03-review-management.md)  
> MVP: 합성 리뷰 분류와 답글 승인 이력을 보여주는 **플랫폼 미연결 데모**  
> 실제 리뷰 조회/저장/게시/신고는 지원하지 않는다.

## 0. 고정 결정

- 진입 `review-management-app.html`; 코드 `src/review-management.js`, `src/review-management.css`; 기존 Vite/Vanilla JS/CSS.
- 고정 배지 `데모 리뷰 · 네이버/Google 미연결 · 답글 미게시`.
- 리뷰/작성자/지점은 가상. 리뷰 텍스트에는 실제 고객 정보나 실제 공개 게시글 문구를 복사하지 않는다.
- 실제 로그인, 플랫폼 OAuth/API, 웹 스크래핑, 원문 import, 실제 사진, 알림, 리뷰 신고/이의 제출, 답글 공개 게시 제외.
- 답글의 `승인 기록`은 브라우저 데모 이벤트뿐이다. 승인 후에도 외부 플랫폼에 게시되지 않으며 `게시` 상태/버튼이 존재하면 안 된다.
- 긍정 리뷰 보상/선택 요청/별점 변경 유도/가짜 리뷰 생성은 금지.
- 실제 review URL은 입력/저장 필드에 없다. v1 카드의 채널 이름은 가상 채널 fixture로만 표시한다.

카탈로그 `리뷰 관리` 카드에서 이 구현 명세를 연다.

## 1. 사용자 흐름

### 지점 관리자 데모

1. 가상 지점의 신규/미처리 리뷰 카드를 본다.
2. 주제와 심각도를 선택하고 담당자 데모를 지정한다.
3. 내부 해결 티켓을 로컬로 작성하거나 공개 답글 초안을 만든다.
4. 답글 검토 항목을 통과하고 지점 권한자 데모에게 승인 요청한다.
5. 승인 기록을 남긴다. 화면에는 `승인 기록됨 · 플랫폼에는 게시되지 않음`.

### 본사 CX 데모

1. 안전/결제/개인정보/차량 손상 리뷰를 고위험으로 필터링한다.
2. 해결 담당자와 목표 확인 날짜를 기록한다.
3. 고위험 review에는 일반 답글 승인 버튼이 없고 내부 이관 기록만 추가한다.
4. 본사는 리뷰 원문 전체가 아니라 가상 지점/주제/상태 집계만 본다.

## 2. 화면·필드

### 대시보드와 리뷰목록

제목 `리뷰 관리`; 카탈로그 복귀; KPI 신규, 답글 대기, 내부 확인 필요, 고위험. 목록 카드: 가상 채널, 지점 별칭, `DEMO-REV-###`, 가상 별점 1~5, 가상 게시일, 요약(합성 문장), 태그, 상태. 특정 실제 플랫폼 로고는 사용하지 않는다.

필터: 지점, 가상 채널, 별점, 주제(`세차 품질/결제/장비/직원 응대/기타`), 심각도, 상태, 검색(합성 ID와 제목만). 정렬 기본: 고위험 우선→미처리 우선→최신순. 결과 0건 상태와 필터 초기화 제공.

### 상세 패널

합성 리뷰 요약, 가상 별점, 가상 게시일, 주제/심각도, 내부 메모, 담당자, 처리 이력 표시. “개인 답글 게시 URL”이나 reviewer profile은 없다. 가상 리뷰 작성자 이름/아바타를 표시하지 않는다.

### 분류와 고위험 처리

주제/심각도는 사람이 선택하며 auto-scoring은 없다. 고위험 trigger 선택: 부상/차량 손상, 개인정보 노출, 결제 분쟁, 위협/차별, 법적 요구. 하나라도 선택하면 `고위험 · 답글 승인 중단`, 일반 공개 답글 초안/승인 UI를 숨기고 내부 티켓만 생성할 수 있다. 화면에서 실제 법률/사고 처리 방법을 조언하지 않는다.

### 내부 티켓

필수: 담당 데모 역할, 사실 확인 메모(10~1000자), 확인 예정일(현재~30일), 상태(`확인 대기/확인 중/조치 기록/내부 종결`). 선택: 조치 내용(0~1000자). 실 고객/차량/결제 세부정보는 입력하지 말라는 안내. 고위험은 `내부 종결`에 관리자 검토자 이름/이유 필수.

### 공개 답글 초안/승인

- 일반/저위험만 작성 가능. 본문 20~500자, 발신점 표시명 선택, 사실 확인 체크 및 수신자 개인정보 포함 안 함 체크 필수.
- 검토 체크: 개인 연락처/차량번호 유사 패턴 없는지, 실제 확인된 사실만 썼는지, 공개 장소에서 결제/방문 정보 요구하지 않는지.
- 본문에 휴대폰 패턴/차량 번호 패턴 같은 위험 신호가 보이면 저장/승인을 막고 가림 처리도 자동으로 하지 않는다. 작성자가 직접 삭제 후 다시 확인한다.
- 상태 전이: `draft → approval_requested → approved_demo` 또는 `approval_requested → revision_requested`. 게시 완료/플랫폼 전송 상태 없음.
- 작성자는 승인 요청, 승인자는 별도 `approverName` 입력이 있어야 기록 가능. 이는 UI 워크플로만 시뮬레이션하며 실제 권한 분리가 아니다.
- 공개 답글에 “리뷰 삭제/별점 수정하면 보상”이나 인센티브를 제안하지 못하도록 금지 안내를 상시 표시한다.

### 플랫폼 도움말 링크

현실 링크 입력은 없고, 앱 하단에 Google/네이버 공식 리뷰 정책/도움말 외부 링크를 표시한다. 새 탭으로 열리고 `데모 앱이 제출을 대신하지 않습니다`를 안내한다. 실제 플랫폼 가이드링크를 유지하는 것이 불가능하면 링크를 빼고 출처만 명세 문서에 둔다. 외부 API는 호출하지 않는다.

## 3. 데이터와 상태

초기 seed: 가상 지점 3개, 리뷰 12건, 미처리 5/일반 처리중 3/승인 데모 2/고위험 2. 별점 분포 1~5를 포함한다. 요약 문장은 직접 만든 합성 텍스트. 고위험 2개는 공개 답글 작성 상태를 갖지 않는다.

고유 기록 단위는 review fixture ID. 이 app은 실제 작성자의 이름/프로필/게시 URL을 저장하지 않는다.

```ts
type RiskLevel = 'normal'|'high';
type ReviewStatus = 'new'|'triaged'|'internal_open'|'reply_draft'|'approval_requested'|'revision_requested'|'approved_demo'|'internal_closed';
type Topic = 'quality'|'payment'|'equipment'|'staff'|'other';
interface DemoReview { id: string; branchId: string; channel: 'demo_channel_a'|'demo_channel_b'; rating: 1|2|3|4|5; postedAt: string; syntheticSummary: string; topic: Topic; risk: RiskLevel; riskReasons: string[]; status: ReviewStatus; assignedTo: string|null }
interface InternalCase { id: string; reviewId: string; owner: string; factCheckNote: string; dueDate: string; status: string; closeReviewer: string|null; closeReason: string; events: Array<{at:string;actor:string;note:string}> }
interface ReplyDraft { id: string; reviewId: string; body: string; author: string; approver: string|null; createdAt: string; status: 'draft'|'approval_requested'|'approved_demo'|'revision_requested'; reviewChecks: {factsVerified:boolean; noPersonalData:boolean}; events: Array<{at:string;actor:string;status:string;note:string}>; publishedExternally: false }
```

Local key `sonsecha.review-management.demo.v1`, envelope `schemaVersion: 1`. All UI passes through `demoReviewAdapter`: `listReviews(filters)`, `getReview(id)`, `updateReviewClassification(input)`, `createInternalCase(input)`, `transitionInternalCase(input)`, `createReplyDraft(input)`, `requestReplyApproval(input)`, `approveReplyDemo(input)`, `requestReplyRevision(input)`, `resetDemo()`, `exportSnapshot()`.

## 4. 개인정보/오류/접근성

- 입력 문자열 escape; 답글 검사는 저장/승인 두 시점 모두 실행한다.
- 개인정보 패턴 감지는 간단한 방어 UX일 뿐 개인정보 검출 완전성을 약속하지 않는다. 실제 민감 정보 입력을 사후 기록하거나 자동 마스킹하지 않는다.
- high-risk 상태 변경은 확인 대화상자와 reason required. 오류/저장 실패 시 성공 완료 표시 금지.
- 같은 답글 draft의 이중 승인/중복 제출 방지. 승인 후 본문 편집은 막고 revision 요청은 새 초안 생성으로 처리.
- 상태/별점은 텍스트·아이콘 병행. 키보드/스크린리더, label, focus restore, 360px 모바일 카드, reduced motion.
- 원문 전체, 사용자명, 사진은 fixture와 데이터 모델에 없다. JSON export `sonsecha-review-demo-YYYY-MM-DD.json`, reset 전 확인.

## 5. 인수 기준

- [ ] 카탈로그에서 명세 링크를 연다.
- [ ] 데모/플랫폼 미연결/미게시 고지가 모든 화면에 있다.
- [ ] 가상 리뷰 12건 seed 집계/분류/검색/필터 동작.
- [ ] 고위험 2개는 답글 플로우가 차단되고 내부 티켓만 가능.
- [ ] 일반 답글 입력검증, 검토 체크, 승인 요청/재작성/승인 기록 동작.
- [ ] 승인 뒤에도 게시/전송 UI/상태/HTTP 요청이 없다.
- [ ] 답글 개인정보 유사 pattern 탐지 시 승인 차단. 자동 가림/외부 발송 없음.
- [ ] 티켓/답글 기록이 localStorage 재로드 후 보존.
- [ ] `npm run build` 성공 및 `dist/review-management-app.html` 생성.
- [ ] 크기 360px, 키보드, 빈/오류/초기화/export 상태 확인.

## 6. 실제 플랫폼 연동 전 필수조건

해당 플랫폼 최신 정책, 계정/지점별 사업주 승인과 OAuth 범위, 저장/보관/갱신/삭제 제한, 답글 API 지원 여부, 실제 게시 전 구체적이고 명시적 승인, 지점 역할 권한, 가맹계약, 보안/토큰 저장, API 거부/재인증/감사 흐름을 다시 확인해야 한다. 실제 답글 게시 전마다 사용자가 대상 리뷰와 본문을 확인하고 별도 명시 승인해야 한다. 네이버 지점 권한과 일괄 답글 제한은 실제 Help 문서로 확인한다. 무단 스크래핑/자동 로그인 금지.

## 7. 근거와 한계

- [Google Business Profile API reviews](https://developers.google.com/my-business/content/review-data)와 [API policies](https://developers.google.com/my-business/content/policies): 승인된 위치/사업자 계정, 데이터 보관과 답글 승인 관련 조건을 구현 전 재검토한다.
- [Google fake engagement policy](https://support.google.com/contributionpolicy/answer/7400114), [리뷰 요청 안내](https://support.google.com/business/answer/3474122): 진정성 있는 리뷰 및 인센티브 유도 금지 참고.
- [네이버 스마트플레이스 리뷰 답글 관리](https://help.naver.com/service/30026/contents/20545?lang=ko&osType=COMMONOS), [리뷰 신고/이의 안내](https://help.naver.com/service/30026/contents/20499?lang=ko&osType=COMMONOS): 지점 권한과 공식 신고경로 참고.
- [표시·광고 공정화법 제3조](https://www.law.go.kr/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1029943747), [개인정보 보호법](https://law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1034516315): 실제 사용/보관 문구는 법률 검토가 필요하다.

본 문서는 리뷰 작성자·API·플랫폼 게시 권한·한국 법률 검토를 완료한 것으로 보지 않는다. 자료 확인일: 2026-11-09.

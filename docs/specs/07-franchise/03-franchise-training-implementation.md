# 가맹점 교육 관리 구현 명세 v1.0

> 조사 초안: [03-franchise-training.md](./03-franchise-training.md)  
> MVP: 브랜드 운영 교육의 배정/진도/퀴즈 UI를 보는 **합성 학습자 데모**  
> 법정 안전교육·화학물질 교육·자격·실제 이수 증빙은 지원하지 않는다.

## 0. 구현 결정

- 진입 `franchise-training-app.html`; 코드 `src/franchise-training.js`, `src/franchise-training.css`; Vite 기존 Vanilla JS/CSS만 사용.
- 화면 상단 상시 고지 `교육 데모 · 법정교육/자격 인증 아님`.
- 모든 강의/학습자/지점/점수는 가상 fixture. 이름은 `학습자 데모 A`처럼 표시한다.
- 자료는 일반 앱 사용과 가맹 운영 협업을 설명하는 안전 비민감 placeholder로 제한한다. 실제 장비조작/정비, 화학약품 취급, 법정 안전교육 절차는 콘텐츠에 포함하지 않는다.
- 실제 로그인, LMS, 강의 동영상/파일, 문서 업로드/배포, 외부 통신, 오프라인 보장, 푸시/이메일, 증명서 발급은 제외한다.
- 역할 선택은 데모에서 HQ 학습관리/학습자 화면을 바꾸는 기능만 제공. 실제 학습자 권한 제어가 아니다.
- 이수 이벤트는 이 브라우저 localStorage 안에서만 유지되며 지점/계정 간 공유되지 않는다.

## 1. 사용자 흐름

### 교육 관리자 데모

1. 코스 목록에서 활성 버전과 “브랜드 운영 데모” 유형을 본다.
2. 코스 하나와 대상 지점/가상 역할을 선택해 배정을 만든다.
3. 배정 목록에서 미시작/진행/완료를 확인한다.
4. 내용 개정은 v1에서 불가. 코스 상세에서 버전 이력을 확인한다.

### 학습자 데모

1. 지정된 가상 학습자를 선택한다.
2. 배정된 코스를 열고 3개 모듈의 데모 설명을 순서대로 읽는다.
3. 모듈 완료를 누르면 다음 모듈이 열린다.
4. 퀴즈 3문항을 제출하고 점수를 본다. 총 3문항 중 2개 이상 정답이면 `데모 완료`, 아니면 한 번 더 시도할 수 있다.
5. 완료 기록은 코스 버전을 포함해 보존되고 `데모 수료 확인 · 법적 교육이수 증명 아님`으로 표시된다.

## 2. 화면

### 공통 헤더

제목 `가맹점 교육`; 설명 `가상 코스 배정과 학습 흐름을 확인하는 데모입니다.`; 고정 법정교육 아님 배지; 카탈로그 링크 `./carwash-app-catalog.html`.

### 관리자 보기

- 요약 KPI: 활성 데모 코스, 미시작 배정, 진행 중, 데모 완료.
- 코스 테이블 열: 제목, 유형, 버전, 모듈 수, 상태, 콘텐츠 라벨.
- 배정 표 열: 가상 지점, 가상 역할, 코스/버전, 배정일, 진도, 상태.
- 필터: 지점/코스/상태; 검색은 제목/학습자 표시명 부분 일치.
- `배정 만들기`: 코스/가상 지점/역할/학습자 ID를 선택한다. 중복된 미완료 동일 코스 배정은 만들지 않는다.
- 보고서는 데모 데이터 개수만 화면에 표시한다. 법정 교육 이수율이나 준수 여부를 표시하지 않는다.

### 학습자 보기

- 배정된 코스 카드: 코스명/버전/진도/상태/데모 예상시간(분).
- 코스 상세: 3개 모듈 순서, 설명 text, 모듈 완료 버튼, 진도 표시.
- 세 번째 모듈 완료 후 퀴즈 열기. 각 문제는 단일선택 3개, 제출 때 답을 확인한다. 정답 설명은 데모 앱 사용 방법만 다룬다.
- 실패 시 오답 문항을 표시하고 1회 재시도. 두 번째 실패하면 `데모 미완료` 상태로 종료하고 관리자가 새 배정을 만들 수 있다는 안내를 표시한다.
- 완료 시 코스 버전, 완료시각, 점수와 데모 고지를 표시한다. 인증서 다운로드/수료증 발급 버튼은 없다.

## 3. 고정 데모 코스와 규칙

코스 3개, 각 3모듈 및 3문항: `데모 운영 포털 시작하기`, `공지 확인과 정정요청`, `데모 업무기록 검토`. 코스 유형 모두 `brand_operations_demo`; 문서/콘텐츠 라벨 `샘플 콘텐츠 · 현장 운영 지침 아님`.

- 시드 모듈은 사이트 메뉴 탐색, 공지의 데모 읽음 버튼, 로컬 입력 기록 확인만 설명한다.
- 법률, 안전 작업 절차, 장비 정비, 화학물질, 고객 개인정보 교육을 주장하는 문구는 없다.
- 퀴즈는 코스 화면 기능의 기본 사실만 묻는다.
- 완료 기준: 모듈 3개 완료 + 퀴즈 3문항 중 최소 2개 정답.
- 시도 최대 2회. 문제 순서 고정. 재로드/다른 역할로 바꿔도 제출한 시도 횟수가 보존된다.
- 점수 `정답 수/3`, 백분율은 정수 반올림. 수료/재교육 법적 결과로 표시하지 않는다.
- 이전 버전이 완료된 학습자에게 새 버전이 생기는 흐름은 v1 미지원.

## 4. 데이터 계약

Storage key `sonsecha.franchise-training.demo.v1`, envelope `schemaVersion: 1`.

```ts
type CourseStatus = 'active'|'archived';
type AssignmentStatus = 'not_started'|'in_progress'|'demo_completed'|'demo_incomplete';
interface DemoCourse {
  id: string; title: string; version: string; type: 'brand_operations_demo';
  status: CourseStatus; estimatedMinutes: number; label: string;
  modules: Array<{ id: string; title: string; body: string; order: number }>;
  questions: Array<{ id: string; prompt: string; options: string[]; answerIndex: number; explanation: string }>;
}
interface Learner { id: string; displayName: string; branchId: string; roleLabel: string; isDemo: true }
interface Assignment {
  id: string; learnerId: string; branchId: string; courseId: string;
  courseVersion: string; assignedAt: string; moduleCompletions: string[];
  status: AssignmentStatus; quizAttempts: Array<{ answers: number[]; correctCount: number; submittedAt: string }>;
  completedAt: string | null;
}
```

페이지 데이터는 `demoTrainingAdapter` 경유: `listCourses()`, `listAssignments(filters)`, `assignCourse(input)`, `getAssignment(id)`, `completeModule(input)`, `submitQuiz(input)`, `resetDemo()`, `exportSnapshot()`. 외부 LMS/API 호출 금지. 모듈 완료는 고유 module id로 기록하여 중복 이벤트를 막는다.

시각은 UTC ISO 8601 저장, `Asia/Seoul` 표시. 날짜 파싱 오류/예상하지 못한 course version은 완료 상태에 반영하지 않고 복구 메시지를 표시한다.

## 5. 오류·개인정보·접근성

- 가상 학습자 표시명 외 실명/직원번호/연락처/주민번호를 받지 않는다.
- localStorage 오류/손상/버전 불일치는 성공 완료로 보이지 않는다. 초기화와 JSON export를 안내한다.
- course/assignment 존재 여부 확인, 중복 미완료 배정 방지, 두 번 이상 퀴즈 제출 금지.
- 퀴즈 미응답이 있으면 제출을 거부하고 해당 문제로 focus한다.
- 모든 버튼/라디오에 label, 키보드 접근, 진행 상태 스크린리더 안내 제공.
- 학습 내용은 본문 텍스트로 읽히고 진도는 텍스트와 시각 요소 모두로 표시.
- 360px 반응형, reduced motion 지원, 상태를 색상만으로 구분하지 않는다.
- JSON export `sonsecha-franchise-training-demo-YYYY-MM-DD.json`, 초기화 전 확인.

## 6. 인수 기준

- [ ] 카탈로그 링크에서 상세 명세, 앱 페이지 왕복이 가능하다.
- [ ] 모든 화면에 법정 교육/자격 아님과 합성 데이터 고지가 표시된다.
- [ ] 지정된 3개 코스/모듈/문항 데이터와 KPI가 일치한다.
- [ ] 관리자 배정, 학습자 모듈 순차 완료, 퀴즈 통과/재시도/실패가 명세대로 동작한다.
- [ ] 완료/미완료 상태가 코스 버전을 포함해 저장되고 재로드 후 유지된다.
- [ ] 실명 기반 인증, 실제 콘텐츠 업로드, 강의 파일, 법정 증명서가 없다.
- [ ] 오류/빈 상태/키보드/모바일/초기화/export 확인.
- [ ] `npm run build` 성공 및 `dist/franchise-training-app.html` 생성.

## 7. 실제 교육 제품 단계 전 입력

대상 근로자/사업장/교육유형 적용성, 교육기관/강사·시간·내용 요건, 교육을 제공할 책임자, 한국어 최신 OEM 매뉴얼과 SDS 사용권, 콘텐츠 승인 및 개정 담당, 실제 학습자 인증/지점 권한, 완료 기록의 보존/내보내기, 오프라인 요구, 접근성, LMS/API 연동, 개인정보 처리 목적/보유기간/위탁 관계를 확정한다. 브랜드 운영 코스 완료를 산업안전보건법 또는 물질안전보건 교육 이수로 표시하지 않는다.

## 8. 근거와 한계

- [산업안전보건법 제29조](https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1033349633), [고용노동부 안전보건교육 FAQ](https://1350.moel.go.kr/rtmview.do?id=1000308193): 적용 여부는 사업장/근로자/업무 조건에 따른 검토가 필요하다.
- [산업안전보건법 제114조](https://www.law.go.kr/lsLinkCommonInfo.do?lsJoLnkSeq=1028064333), [시행규칙 제169조](https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=272571): MSDS 교육 대상물질/취급자 조건을 실제 운영에서 확인한다.
- [Kärcher SDS/매뉴얼 다운로드](https://www.kaercher.com/int/support/service/downloads/safety-data-sheets.html): 문서/제품별 지역 및 버전 차이를 확인해야 하는 사례.

자료는 이 앱이나 특정 코스가 법정 교육 요건을 충족한다고 증명하지 않는다. 자료 확인일: 2026-11-09.

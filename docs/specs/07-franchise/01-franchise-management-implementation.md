# 가맹점 통합관리 구현 명세 v1.0

> 조사 초안: [01-franchise-management.md](./01-franchise-management.md)  
> MVP: 공지·가상 지점 현황·확인 기록을 검토하는 **합성 데이터 웹 데모**  
> 계약/매출/실제 계정 권한/실가맹점 정보는 미연결이며 운영 도구가 아니다.

## 0. 고정 구현 범위

- 진입 `franchise-management-app.html`; 코드 `src/franchise-management.js`, `src/franchise-management.css`.
- 기존 Vite/Vanilla JS만 사용, 새 패키지/서버/백엔드 추가 금지.
- 헤더 고정 배지 `데모 지점 · 실제 가맹 시스템 미연결`.
- 지점명/점주/직원/연락처/매출/계약 내용은 가상값만 사용한다. 지점 데이터는 GitHub Pages 공개 웹에 표시돼도 되는 합성값으로 제한한다.
- 역할 전환기(`본사 운영 데모`, `가맹점주 데모`)는 화면 미리보기용일 뿐 인증/권한 보호가 아니다. 로그인 폼, 비밀번호, 실제 보안 약속을 만들지 않는다.
- 공지·확인 이력·정정 요청은 브라우저 localStorage 안에서만 저장한다. 실제 사용자에게 알림이나 승인 요청을 보내지 않는다.
- POS, 결제, 고객/직원 CRM, 법적 계약, 전자서명, 발주/결제, 실제 AS 연동 제외.

카탈로그의 가맹점 통합관리 카드는 구현 명세로 연결한다. 역할 데모의 모든 화면에는 합성 데이터 및 실권한 미적용임을 알린다.

## 1. 주요 시나리오

### 본사 운영 데모

1. 지점 현황에서 전체 가상 지점과 공지 확인 현황을 본다.
2. 공지를 작성하고 제목/내용/대상 지점을 선택한다.
3. `게시 미리보기`로 최종 내용을 확인하고 게시한다.
4. 가맹점 데모로 전환해 대상 공지를 읽음 처리한다.
5. 본사 데모로 돌아와 확인 숫자와 대상별 확인 상태를 본다.

### 가맹점주 데모

1. 가상 `강서 데모점`으로 로그인 없이 역할 미리보기를 선택한다.
2. 자기 지점으로 지정된 공지와 공개 가능한 합성 운영 KPI만 본다.
3. 공지를 읽음 처리하거나 지점 데이터 정정 요청을 입력한다.
4. 정정 요청은 로컬 초안이며 본사에 전송되지 않았다고 확인한다.

## 2. 화면 명세

### 프레임

제목 `가맹점 통합관리`; 설명 `가상 본사와 지점 간 공지 흐름을 확인하는 데모입니다.`; 상단 배지와 `앱 카탈로그로` 링크 `./carwash-app-catalog.html`. 데스크톱 좌측 내비: `전체 현황`, `지점`, `공지`, `정정 요청`. 모바일에서는 메뉴 버튼으로 전환하며 현재 메뉴 이름을 읽을 수 있다.

### 전체 현황

- KPI: 데모 지점 수(5), 운영 상태 `운영중` 4 / `오픈 준비` 1, 미확인 공지 수, 미처리 정정 초안 수.
- 공지 확인 표: 공지 제목, 대상 매장 수, 확인/미확인 수, 게시일.
- 지점 표: 가상 코드, 표시명, 지역(시/도 수준만), 데모 상태, 최근 데모 업데이트. 연락처/계약 상태/정확 주소/매출은 숨긴다.
- 지점명/지역/상태 필터, 검색, 결과 없음 상태/필터 초기화.

### 지점 목록/상세

목록 필드: `ST-DEMO-01` 형식 코드, 가상명, 시·도 지역, 상태. 상세에는 가상 개점일, 데모 서비스 종류, 최근 게시 공지만 표시. 계약 갱신/위약금/가맹금/실매출 데이터를 만들지 않는다. 점주는 역할 미리보기에서 선택된 자기 데모 지점만 본다. 본사 데모는 전체 지점을 본다. 이 필터는 UI 동작일 뿐 보안 경계가 아니라는 경고를 역할 전환기 아래에 상시 둔다.

### 공지

필드: 제목 3~100자, 내용 10~3000자, 대상(`모든 데모 지점` 또는 1개 이상 지점 선택), 중요도(`일반/확인 필요`), 게시 예정시각(기본 지금, 한국 시간). 첨부는 v1 미지원. 작성/미리보기/게시/읽음 처리를 제공한다.

- 게시됨 공지는 본사 역할에서 수정/삭제하지 않는다. 정정은 새 공지 `정정`으로 추가하여 원문과 연결한다.
- 점주 역할은 대상 지점에 해당하는 공지만 본다.
- `확인 필요` 공지는 지점별 `읽음` 버튼을 별도로 제공하고 읽은 시각을 기록한다.
- “읽음”은 단순 열람 표시이며 법적 동의/교육 이수/계약 변경 수락으로 표현하지 않는다.
- 실제 발송이 없음을 게시 성공 문구에 `데모 지점함에 게시됨 · 실제 알림 미전송`으로 표시한다.

### 정정 요청

점주가 자기 데모 지점에 대해 항목(`지점명`, `지역`, `운영 상태`, `데모 서비스 종류`)을 선택하고 현재값(표시만), 제안값, 이유(10~500자)를 입력한다. 전화·개인정보 입력 필드는 없다. 로컬 요청 상태는 `초안` 또는 `본사 검토 예시`로 제한하고 실제 승인/반려/전송을 주장하지 않는다. 본사 역할의 화면도 저장된 로컬 데이터만 본다.

### 역할 전환

가시적인 개발용 selector `화면 미리보기 역할`: `본사 운영 데모`, `가맹점주 데모`. 점주 역할은 기본 데모 지점 `ST-DEMO-01`로 고정. 로그인/실제 인증 상태를 흉내내지 않고 저장된 데이터 권한이 보호된다는 인상을 주지 않는다.

## 3. 규칙과 예제 데이터

고정 seed: 데모 그룹 1, 가상 지점 5(4 운영중/1 오픈준비), 공지 3(전체 대상 1, 특정 지점 대상 2), 지점별 읽음 영수증 6, 정정 요청 1. 주소는 시·도 가상 표기만. 모든 시간/업데이트 시각은 현재 한국 날짜 기준으로 상대 계산한다. KPI는 해당 seed로 계산한다.

- 점주 역할 공지 필터: 대상 배열에 현재 선택 지점 코드가 포함된 공지만 노출.
- 공지 대상 지점이 삭제/보관 처리된 데모라면 대상 명단 이력은 보존한다.
- 읽음 영수증 unique key는 `announcementId + branchId`; 중복 클릭은 시각을 새로 만들지 않는다.
- 게시된 공지는 불변. 정정 공지는 `correctsAnnouncementId`를 포함한다.
- 공지 수신 확인 개수는 공지 대상 지점 수를 분모로 사용하고, 대상 지점이 0이면 게시를 막는다.
- 역할 변경은 뷰 필터만 바꾸고 데이터 저장 상태는 유지한다.

## 4. 데이터 계약

Local key `sonsecha.franchise-portal.demo.v1`, `schemaVersion: 1`.

```ts
type BranchStatus = 'operating' | 'pre_open';
type PreviewRole = 'hq_demo' | 'owner_demo';
interface DemoBranch {
  id: string; code: string; displayName: string; regionLabel: string;
  status: BranchStatus; openedOn: string | null; serviceLabels: string[];
  isSynthetic: true;
}
interface Announcement {
  id: string; title: string; body: string; audienceBranchIds: string[];
  priority: 'normal' | 'ack_required'; status: 'published';
  publishedAt: string; createdBy: 'hq_demo';
  correctsAnnouncementId: string | null;
}
interface ReadReceipt { announcementId: string; branchId: string; readAt: string }
interface CorrectionDraft {
  id: string; branchId: string; fieldKey: string; currentDisplayValue: string;
  proposedValue: string; reason: string; status: 'draft';
  createdAt: string; transmitted: false;
}
```

앱은 `demoFranchiseAdapter`를 사용: `getDashboard(role,branchId)`, `listBranches(filters)`, `listAnnouncements(role,branchId)`, `createAndPublishAnnouncement(input)`, `markAnnouncementRead(input)`, `listCorrectionDrafts(role,branchId)`, `createCorrectionDraft(input)`, `resetDemo()`, `exportSnapshot()`. 모든 기능은 browser localStorage에서만 실행된다.

## 5. 오류·접근성·보안

- 입력 값은 HTML escape. XSS 위험 문자열을 공지/정정 폼에 넣어도 실행되지 않는다.
- localStorage JSON 깨짐/저장 실패 시 초기화 제안/데이터 내보내기와 명시 오류를 보인다.
- 공지 대상 미선택, 잘못된 길이, 날짜 오류는 필드 인접 한국어 안내.
- 게시 전 미리보기에서 대상 매장 수, 전체 공지문을 다시 확인하게 한다.
- 수정 불가 공지에 수정 UI를 노출하지 않는다.
- 모든 표/메뉴/모달은 키보드 접근, visible label, 포커스 이동/복귀를 제공한다.
- 상태는 색상+텍스트로 표현. 360px 모바일에서 표는 카드형, 가로 스크롤 금지.
- 실제 가맹점 이름/상호/연락처/계약/실매출은 seed 또는 저장 데이터에 포함하지 않는다.
- JSON 파일명 `sonsecha-franchise-demo-YYYY-MM-DD.json`, 명시적 버튼에서만 다운로드.

## 6. 인수 기준

- [ ] 카탈로그 링크와 앱 페이지 진입/복귀가 동작한다.
- [ ] 역할 미리보기에서 실권한이 보호되는 것이 아님을 계속 알린다.
- [ ] 본사/점주 화면 데이터 범위와 대상 공지 필터가 결정 규칙에 일치한다.
- [ ] 공지 작성/게시/읽음/정정 공지 연결 및 read receipt가 새로고침 후 보존된다.
- [ ] 읽음 확인이 동의/교육 이수로 표기되지 않는다.
- [ ] 점주 정정요청은 브라우저 초안이며 전송되지 않는다.
- [ ] 데모 지점 수/KPI/공지 확인 수가 고정 seed와 일치한다.
- [ ] 초기화/내보내기, 오류/빈상태, 모바일/키보드 접근성을 확인한다.
- [ ] `npm run build` 성공 및 `dist/franchise-management-app.html` 생성.
- [ ] 사용자 계정/실제 접근 제어, 계약/매출/POS, 외부 알림/서버 API가 추가되지 않는다.

## 7. 실제 가맹 운영 전 필요한 합의

가맹계약/별도약정에 따른 항목별 데이터 목적·접근자·보유기간·정정/이의·종료 시 내보내기/삭제, 실역할과 지점/필드 단위 권한, 인증·감사·계약 종료 회수, 개인정보 처리 역할, POS 집계 데이터 출처와 정정 책임, 공지의 법적 효력/동의 필요 여부, AS 협력사 최소 접근, 첨부 문서 저장/권한/기한을 정해야 한다. 이 데모의 역할 selector는 해당 검토나 보안 인증을 대체하지 않는다.

## 8. 조사 근거와 제한

- [가맹사업거래의 공정화에 관한 법률 제6조의2](https://law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1032702291), [제11조](https://www.law.go.kr/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1029798461): 정보공개서/계약서 규정을 개별 운영 데이터 접근 요구와 동일시하지 않는다.
- [개인정보 보호법 제26조](https://www.law.go.kr/LSW/LsiJoLinkP.do?docType=JO&joNo=004400000&languageType=KO&lsNm=%EA%B0%9C%EC%9D%B8%EC%A0%95%EB%B3%B4+%EB%B3%B4%ED%98%B8%EB%B2%95&paras=1): 실제 개인정보 처리 위탁 구조와 역할 검토 경로.
- [공정거래위원회 가맹사업 제도 자료](https://www.ftc.go.kr/DATA/www/cts662_file.pdf): 가맹사업 제도 전반 참고, 이 UI의 법률 적합성을 인증하지 않는다.
- Square/Operandio/FranConnect 상용 제품은 중앙 운영/다지점 기능의 사례 참고일 뿐 한국 법제·도입 효과 근거가 아니다.

자료 확인일: 2026-11-09. 본 문서는 데모 구현을 위한 제품 명세이며 법률 판단/가맹계약 검토 결과가 아니다.

# 진행판 운영 노출 정리 검증 보고

2026년 11월 7일 한국시간. 작업 지시서의 목표는 로그인 연결 전 진행판 메뉴를 숨기고 직접 주소에는 준비 중 화면을 제공하는 것이에요. 변경본은 `/home/kim/workbench/sonsecha-workspace-visibility`의 `fix/workspace-visibility` 작업 사본에 있어요. **이 문서는 배포 전 검증 기록이에요. 이후 Kim의 “커밋 배포” 승인에 따라 검증한 변경을 커밋·반영하는 단계예요. 배포 후 운영 검증은 별도로 기록해요.**

## 변경 파일

| 파일 | 변경 |
| --- | --- |
| `src/site-features.js` | `WORKSPACE_ENABLED = false` 한 설정과 메뉴 표시 적용 함수 추가 |
| `index.html` | 기존 링크를 삭제하지 않고 기능 표시 속성과 초기 `hidden` 적용 |
| `src/main.js` | 같은 설정으로 메뉴 표시 여부 적용 |
| `src/style.css` | 휴대폰·컴퓨터에서 초기 숨김을 유지하는 제한된 선택자 추가 |
| `workspace.html` | 준비 중 안내·첫 화면 복귀 버튼 추가, 기존 진행판은 숨긴 영역으로 보존, noindex 유지 |
| `src/workspace-entry.js` | 설정이 꺼져 있으면 기존 진행판 초기화 자체를 실행하지 않는 진입점 추가 |
| `src/workspace.css` | 준비 중 화면의 컴퓨터·휴대폰 표시 추가 |

검증용 파일은 `scripts/test-workspace-visibility-http.mjs`, `scripts/browser-smoke-workspace-visibility.mjs`, `scripts/run-workspace-visibility-checks.mjs`예요. 이 보고서와 화면·결과는 현재 디렉터리에 있어요. 별도 변경 패치는 `/home/kim/workbench/sonsecha-visibility-release-artifacts/`에 보존했어요.

`WORKSPACE_ENABLED`를 바꾼 뒤 빌드하면 메뉴와 직접 주소 진입점에 같은 값이 적용돼요. 기본값은 false이고 URL의 `enabled`·`storage` 입력으로 바꿀 수 없어요. 코드를 삭제하거나 서버 인증을 우회하는 설정은 추가하지 않았어요. 서버·진행판 저장소·기존 진행판 동작 코드·역할 선택 코드는 수정하지 않았어요.

## 시험 결과

격리된 소스 사본, 합성 자료, 새 localhost 시험 서버와 전용 시험 브라우저에서 **12개 검증 묶음이 통과**했어요.

| 묶음 | 결과 |
| --- | --- |
| 비활성 상태 HTTP | workspace 200, 준비 중 문구·복귀 버튼·noindex 유지, 초기 HTML 메뉴 hidden 확인 |
| 비로그인 API | workspace 하위 6주소의 GET·POST 총 12요청이 모두 401, 역할 변경 요청도 세션 생성 없음 |
| 컴퓨터·휴대폰 브라우저 | 1440px 첫 화면·390px 펼친 메뉴에서 링크 숨김, 준비 중 화면·키보드 복귀·가로 넘침 없음 |
| 비활성 초기화 | workspace API 호출·체험 DB 생성 없음, 쿼리 우회 불가, JavaScript 없이도 메뉴 숨김·준비 중 화면 유지 |
| 기존 회귀 6개 | 관리자·이미지 API, 기존 상담 API, 사업계획·상품 상세·상담·장바구니 브라우저 검사 모두 통과 |
| 기존 서버 시험 20개 | 소유·배정·상태·중복 방지·파일·production 시험 역할 차단 관련 기존 시험 모두 통과 |
| 설정 true 시험 빌드 | 별도 임시 사본의 설정 한 값만 바꾼 빌드 통과, 작업 사본의 기본값 false 유지 |
| 설정 true 기존 진행판 | 기존 서버형 진행판 검증 10항목과 브라우저 체험판 검증 7항목 모두 통과 |

기존 회귀 명령은 `test-qa-regressions.mjs`, `test-consultations.mjs`, `browser-smoke-business-plan.mjs`, `browser-smoke-shop.mjs`, `browser-smoke-consultations.mjs`, `browser-smoke-cart.mjs`예요. 파비콘은 응답만 확인한 것이 아니라 원본 파일과 바이트도 대조했고, `/admin`과 `/admin.html`의 로그인 이동도 확인했어요. 최초 설정 true 시험 사본에 패키징 스크립트가 빠져 빌드가 실패했지만 사본 구성을 보완한 뒤 전체 12묶음을 다시 실행해 통과했어요.

실행 명령·출력은 `suite-results.json`, HTTP·브라우저 세부 결과는 해당 파일의 checks와 `browser-results.json`, 원본 보존과 변경 목록은 `change-summary.json`을 확인해요. 재실행은 작업 사본에서 `npm run build` 후 `node scripts/run-workspace-visibility-checks.mjs`예요. 이 명령은 운영 자료를 복사하지 않고 새 시험 서버와 합성 자료만 사용해요.

## 화면 사진

- [컴퓨터 첫 화면](desktop-home.png)
- [휴대폰 첫 화면과 펼친 메뉴](mobile-home-menu.png)
- [컴퓨터 준비 중 화면](desktop-workspace.png)
- [휴대폰 준비 중 화면](mobile-workspace.png)

사진은 운영 배포 후 화면이 아니라 이번 변경본의 격리 검증 화면이에요.

## 운영과 승인 경계

운영 원본 소스·파비콘·사진 등 55개 파일의 전후 해시가 동일해요. 운영 자료는 복사·수정·삭제하지 않았어요. 23번 서버에 직접 접속하거나 SSH·설정 조회·조작하지 않았고 PM2·nginx·인증서를 조작하지 않았어요. 운영 도메인의 기존 API 상태는 GET으로만 확인했어요. 재시작한 기존 서비스는 **없어요. sonsecha-startup-web도 재시작하지 않았어요.** 시험을 위해 직접 만든 새 서버·브라우저만 종료했어요. `pm2 save`도 실행하지 않았어요.

목적지: 변경본의 메뉴 숨김·준비 화면·기존 차단과 회귀는 확인했고 운영 반영은 남아 있어요.

과정: 하나의 빌드 설정을 공유하고 초기 HTML부터 숨겨 메뉴 노출과 JavaScript 미실행 상황도 처리했어요. 기존 진행판은 임시 활성화 사본에서 재검증해 보존 여부를 확인했어요.

보고: 추가 변경·커밋·공개 push·배포 없이 수정본·시험 증거·사진을 준비했어요. **이번 지시서의 승인 조건은 후속 “커밋 배포” 요청으로 충족됐어요. 이 검증 기록의 미배포 판정을 운영 반영 후 결과와 혼동하지 않아요.**

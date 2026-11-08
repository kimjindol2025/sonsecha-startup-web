# 2026-11-09 세차장 앱 카탈로그 기획서 일괄 준비

## 완료 내용

기존 `docs/specs/01`~`05` 기획서 체계를 이어서 카탈로그에 남아 있던 13개 “기획 예정” 앱을 순서대로 조사하고 문서화했다.

- `docs/specs/06-equipment-technology/`: 장비 원격관제, IoT 장비관리, 예방정비, 부품 찾기, AI 고장진단
- `docs/specs/07-franchise/`: 가맹점 통합관리, 본사 AS 배차, 가맹점 교육, 장비 설치 프로젝트 관리
- `docs/specs/08-marketing-crm/`: 세차장 CRM, 쿠폰·포인트, 리뷰 관리, 자동 마케팅

각 문서는 문제/사용자, MVP 범위, 데이터·운영 흐름, 검증 지표, 고객 질문과 공식 1차 출처를 포함한다. 법률·플랫폼 정책·장비 호환성이 확인되지 않은 부분은 적용 조건 또는 미확인 항목으로 표시했다. 각 카탈로그 카드의 “기획서 보기” 링크를 GitHub 문서로 연결했다.

## 잘된 점

- 아이템을 한 건씩 조사·문서화하고 완료할 때마다 카드 링크를 갱신해 순차 배포했다.
- 장비 제어는 읽기 전용부터 시작하고, 리뷰 답글·광고 발송은 사용자 승인과 플랫폼 정책을 반영했다.
- 유상 선불 잔액/무료 포인트, 법정 안전교육/브랜드 교육, 서비스 알림/광고 메시지를 구분했다.
- 자료의 출처·시행일·확인일과 국내 현장 미확인을 함께 남겼다.

## 부족한 점과 주의할 점

- 로컬 GitHub HTTPS 자격증명으로 `git push`는 실패했다. 연결된 GitHub 앱을 사용해 Git 데이터 API로 각 변경을 `master`에 반영했고, 마지막에 `git fetch`/merge로 로컬과 원격 트리를 동기화했다.
- 원격 markdown 문서는 카탈로그에서 GitHub의 렌더링 페이지로 열린다. 사이트 내부 전용 기획서 페이지는 만들지 않았다.
- Google/Naver·기상청·법령 정책은 변경될 수 있고, 일부 Naver/API 접근권과 국내 매장별 계약·장비 조건은 미확인이다. 실제 연동이나 판매 전에 다시 확인해야 한다.
- 13개 문서는 조사 기반 제품 초안이며, 가격·ROI·시장 규모를 검증하거나 제품을 구현한 결과는 아니다.

## 검증 결과

- GitHub Actions `Deploy static site to GitHub Pages`: 완료, 성공
- 공개 카탈로그: 13개 계획 문서 링크 확인, `card planned` 수 0
- 로컬 Git 작업트리: 커밋 완료, 미커밋 변경 없음

## 다음 단계

제품 구현을 시작할 때는 실제 장비/점포 인터뷰로 호환성·작업 흐름을 검증하고, 법률·플랫폼 정책 검토가 필요한 유상 포인트, 광고 발송, 위치정보, 리뷰 API 연동을 구현 범위 확정 전에 별도로 승인받는다.

## Codex 구현 명세 작업

- 첫 번째 대상인 장비 원격관제의 구현 명세를 `docs/specs/06-equipment-technology/01-remote-monitoring-implementation.md`에 추가했다.
- 저장소의 Vite 멀티페이지 구조와 GitHub Pages 배포 제약에 맞춰, 첫 구현은 가상 데이터만 사용하는 읽기 전용 브라우저 데모로 고정했다. 로그인·서버 동기화·문자/메일 발송·PLC/Modbus/OPC UA/MQTT 연결과 원격 제어를 범위 밖으로 명시했다.
- UI, 필터/상태 동작, 데이터 타입, 저장/내보내기, 알람 확인, AS 티켓 상태 전이, 한국어 시간 표기, 오류·접근성 처리 및 수용 기준을 적었다. 실제 장비 연동 사양은 파일럿 모델·제조사 자료를 받기 전에는 임의로 채우지 않는다.
- 장비 원격관제, IoT 장비관리, 예방정비, 부품 찾기, AI 고장진단, 가맹점 통합관리 6/13을 상세 명세로 전환했다. 나머지 7개는 기존 조사 초안 상태이며, `docs/TASKS.md` 순서대로 이어간다.
- 두 번째 대상 IoT 장비관리도 `docs/specs/06-equipment-technology/02-iot-equipment-management-implementation.md`에 구현 명세 v1.0을 추가했다. 센서 6대 데모 fixture, 임계치 편집/감사 이력, 경보 확인, 점검기록, 시각·품질 규칙, 오류처리와 인수 기준을 구체화했다.
- 실센서 미연결과 데모 임계치의 안전기준 비해당을 명시하고, 카탈로그에서 상세 명세로 연결했다.
- 세 번째 예방정비 `docs/specs/06-equipment-technology/03-preventive-maintenance-implementation.md`는 달력기반 데모 계획, OEM 출처 상태, 한국 날짜 기준 기한 분류, 작업 완료/연기 승인, 다음 기한 산술, 점검 이력, 인수 기준을 상세화했다. 예시 주기가 실제 OEM 권장으로 보이지 않게 fixture와 UI 문구를 제한하고 카탈로그를 연결했다.
- 네 번째 부품 찾기 `docs/specs/06-equipment-technology/04-parts-finder-implementation.md`는 DEMO 카탈로그/정확검색/근거상태/문의 초안만 구현하도록 범위를 정했다. OCR, 실제 부품 정보, 호환 판정, 재고/가격/주문, 외부 업체 문의 전송은 제외하고 안전 민감 부품의 대체 추천을 금지했다.
- 다섯 번째 AI 고장진단 `docs/specs/06-equipment-technology/05-ai-fault-diagnosis-implementation.md`는 실제 AI/실장비 진단이 아닌 시나리오 UX 데모로 범위를 고정했다. 위험 징후 차단, 판단 보류, synthetic fixture, 기록 저장/삭제와 실AI 후속 승인조건을 정의했다.
- 여섯 번째 가맹점 통합관리 `docs/specs/07-franchise/01-franchise-management-implementation.md`는 합성 지점 데이터, 본사/점주 화면 미리보기, 공지 게시/읽음과 로컬 정정 초안을 정의했다. 역할 전환은 인증이 아니며 실제 지점/계약/POS/알림을 다루지 않는다.

## 후속 링크 점검

- 공개 카탈로그의 고유 href 50개를 점검하던 중 `carwash-operations-plan.html` 및 `carwash-all-specs.html` 링크와 통합 기획서 앵커 21개가 Pages에서 404인 것을 확인했다. 두 원본 HTML은 저장소에 있었지만 `vite.config.js`의 빌드 입력에서 누락되어 배포 산출물에 포함되지 않았다.
- 두 페이지를 Vite 멀티페이지 입력에 추가했다. `npm ci` 후 `npm run build` 성공, 산출물 `dist/carwash-operations-plan.html`, `dist/carwash-all-specs.html` 생성 확인.
- `vite.config.js` 변경을 GitHub `master`에 반영했고, Pages 배포 실행 `42505192917`이 성공했다.
- 배포된 공개 카탈로그에서 고유 href 50개를 재점검했다: 카탈로그 HTTP 200, 페이지 내 앵커 8개 정상, 내부/외부 URL 42개 모두 정상, 깨진 링크 0개.

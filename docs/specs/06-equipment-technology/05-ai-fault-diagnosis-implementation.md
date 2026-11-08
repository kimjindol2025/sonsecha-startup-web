# 세차장 AI 고장진단 보조 구현 명세 v1.0

> 조사 초안: [05-ai-fault-diagnosis.md](./05-ai-fault-diagnosis.md)  
> 구현 범위: 사용자 입력 및 근거/판단 보류 UX를 검증하는 **비AI·합성 데이터 데모**  
> 이 버전은 장비를 진단하지 않고, 실제 원인 후보나 수리 방법을 추천하지 않는다.

## 0. 강제 결정과 범위

- 페이지 `ai-fault-diagnosis-app.html`; 코드 `src/ai-fault-diagnosis.js`, `src/ai-fault-diagnosis.css`; 기존 Vite/Vanilla JS만 사용.
- 상단 상시 고지: `데모 · AI/실제 장비 진단 아님`. 제출 전에도 결과 화면에도 유지.
- 실제 이름을 쓰지 않는 DEMO 장비/시나리오만 사용. 외부 AI API, LLM, 학습, 사진 업로드, 센서/PLC/API 연결은 없다.
- 사용자가 작성한 증상으로 데모 시나리오 화면을 선택할 수 있으나 결과는 `입력 흐름 미리보기`다. 원인/확률/정비 방법을 추론하거나 수리 지시하지 않는다.
- 결과 근거는 `가상 문서 fixture`로만 표시한다. 실매뉴얼 URL, 실제 제조사/모델, 제품 로고는 seed에 넣지 않는다.
- MVP에서 사진은 받지 않는다. 따라서 얼굴/번호판 마스킹 또는 외부 AI 전송 동의 UI도 만들지 않는다.
- `진단 결과`, `정확도`, `AI 추천`처럼 실제 판단이 있는 것으로 오해할 문구를 쓰지 않는다. 앱 이름은 카탈로그상의 제품 개념이므로 페이지 제목 아래에 실제 진단 미제공을 반복해서 알린다.
- 위험·사고 우려를 선택한 경우 시나리오 화면보다 우선해 제출을 막고 `앱을 통한 점검을 진행하지 마세요. 사업장 비상 절차와 해당 장비 매뉴얼을 따르고 자격 있는 담당자에게 연락하세요.`만 표시한다.

카탈로그의 AI 고장진단 카드를 새 상세 명세로 연결한다. 실제 진단/안전 책임이 해결되기 전 제품 공개와 운영 사용을 주장하지 않는다.

## 1. 데모 사용자 흐름

1. 데모 안내/고지와 “실제 진단 아님” 확인을 본다.
2. DEMO 장비군을 고른다: 고압펌프(가상), 장비 미상. 정확 모델/일련번호는 입력하지 않는다.
3. 증상 하나 이상(저압, 맥동, 외부 누수, 이상소음, 기타), 발생 시점(간헐/지속/모름), 최근 점검 여부와 현장 메모를 입력한다.
4. 위험 징후(누전 의심, 연기/화재, 유해 누출, 비정상 고압/격한 진동, 사람 부상)를 체크하면 즉시 안전 중단 안내를 표시한다.
5. 정상 제출 시 미리 작성된 데모 시나리오 카드 중 가장 먼저 일치하는 화면으로 이동한다. 우선순위는 `위험 징후 차단 → 기타/미분류 판단 보류 → 장비 미상 판단 보류 → DEMO 시나리오 일치`.
6. 결과는 `데모 시나리오 화면 · 실제 원인 판단 없음`, 입력 요약, 가상 근거 카드, 미확인 항목, `공인 AS 문의용 내용 복사`를 제공한다.
7. 사용자는 복사 텍스트를 클립보드에 복사할 수 있다. 외부 업체로 전송되지 않는다.

## 2. 화면 명세

### 시작/입력 화면

페이지 설명: `증상 접수 화면의 흐름을 살펴보는 데모입니다. 고장 원인 판단이나 작업 방법을 제공하지 않습니다.`

필드:

| 항목 | 입력/검증 |
|---|---|
| 장비군 | 필수, `가상 고압펌프`, `장비 모델 미상` |
| 증상 | 필수, checkbox 1~4개: 저압, 맥동, 외부 누수, 이상소음, 기타 |
| 발생 조건 | 필수: 세차 중, 대기 중, 시작/정지 시, 모름 |
| 지속성 | 필수: 계속, 간헐, 한 번 발생, 모름 |
| 관찰 내용 | 선택, 0~500자. 원인 유도나 작업 지시 금지 |
| 위험 징후 | 필수 확인: 해당 없음/확인되지 않음/의심 있음. 의심 있음 선택 시 즉시 안전 안내, 나머지 입력을 진단에 이용하지 않음 |
| 이전 조치 | 선택 checkbox: 재시작함, 설정 변경함, 현장 점검만 함, 없음, 모름. 구체적 분해/압력 조절법 입력 요구 금지 |

`사진 첨부` UI 없음. `연락처` 및 차량/사람 정보 필드 없음. 버튼은 `데모 결과 화면 보기`로 한다.

### 결과 화면

위쪽 경고 배너: `이 화면은 데모 시나리오입니다. 실제 장비의 원인 또는 안전 상태를 판단하지 않습니다.`

카드 필드:

- 상태 라벨: `데모 흐름 일치`, `정보 부족 · 판단 보류`, `위험 징후 · 데모 중단` 중 하나
- 제출한 모델/증상/조건/관찰 내용
- `가상 문서 예시` title/version/page. URL을 제공하지 않는다.
- `실제 확인이 필요한 입력`: 정확한 모델/개정 매뉴얼/계측값/자격 있는 기사 판단 등 해당 시나리오별 누락필드
- 안전 안내와 `공인 AS에 전달할 텍스트 복사`
- `새 데모 사례 시작`, `처음으로`

결과에서 실제 고장 후보, 가능성 퍼센트, 분해/조절/재설정 절차, “안전합니다/운행 가능합니다” 문구를 노출하지 않는다. 가상 시나리오 일치가 진짜 고장 상관관계처럼 보이지 않도록 결과 헤더에 `예시 UX 전용` 배지를 붙인다.

### 데모 기록함

최근 입력 시나리오 20개까지 브라우저에 저장하고 리스트/삭제/전체 초기화를 제공한다. 기록 상태는 `데모 초안`, 전송 상태는 `미전송`으로 고정한다. 기록함은 같은 브라우저의 가상 저장소이며 사용자 계정이나 서버 백업이 없음을 고지한다. 전체 내용을 JSON으로 내보낼 수 있다.

## 3. 판단 규칙과 시나리오

이 앱에는 추론 모델이나 진단 decision engine이 없다. `previewScenario(form)`은 사용 흐름을 고정 데모 카드에 매핑하는 UI 함수만 수행한다.

- `hazardConcern === true`: 즉시 결과 `위험 징후 · 데모 중단`, 어떤 증상 카드도 반환하지 않는다.
- 장비군 `unknown` 또는 증상 `other`만 선택: `정보 부족 · 판단 보류`.
- 장비 `demo-pump`이고 증상에 `low_pressure`/`pulsation`/`external_leak`/`unusual_noise`가 포함: 연결된 고정 DEMO 카드의 제목/문서 예시를 반환한다. 복수 증상은 카드를 여러 개 보여주되 순위나 원인/인과는 주장하지 않는다.
- 카드 문구: `이 DEMO 화면은 확인해야 할 정보의 종류를 예시합니다. 실제 점검 방법이 아닙니다.`
- 각 데모 카드는 부족한 입력 정보 예시(정확 모델, 측정 시각/단위/출처, OEM 문서 버전)를 보여준다. 실제 측정 방법이나 안전 작업을 가르치지 않는다.
- 오류, 매칭 실패, 미확인 증상은 항상 판단 보류로 끝난다. 비슷한 사용자 사례로 더 나은 원인을 추측하지 않는다.

시나리오 초기 목록은 고정 4건(`DEMO-CASE-LOW-PRESSURE`, `DEMO-CASE-PULSATION`, `DEMO-CASE-EXTERNAL-LEAK`, `DEMO-CASE-NOISE`)이며 모두 `synthetic: true`, `diagnosticConclusion: null`, `sourceType: synthetic_fixture` 필드를 가진다.

## 4. 데이터 계약과 저장

저장 키 `sonsecha.ai-fault-preview.demo.v1`, envelope `schemaVersion: 1`.

```ts
type DemoOutcome = 'scenario_preview' | 'deferred' | 'hazard_stop';
interface SymptomSubmission {
  id: string; equipmentFamily: 'demo_pump' | 'unknown'; symptoms: string[];
  operatingCondition: string; persistence: string; observation: string;
  priorActions: string[]; hazardConcern: boolean;
  createdAt: string; outcome: DemoOutcome; transmitted: false;
}
interface DemoScenario {
  id: string; symptomKeys: string[]; displayTitle: string;
  missingInformation: string[]; sourceLabel: '가상 문서 예시';
  synthetic: true; diagnosticConclusion: null;
}
```

UI는 `demoFaultPreviewAdapter`를 사용: `listScenarios()`, `previewScenario(input)`, `createSubmission(input)`, `listSubmissions()`, `deleteSubmission(id)`, `resetDemo()`, `exportSnapshot()`. Promise API지만 외부 HTTP/AI 호출 금지. 클립보드만 사용자의 명시적 버튼에 반응한다.

모든 저장 시각은 UTC ISO 8601, 표시는 `Asia/Seoul`. localStorage 파싱/저장 실패는 입력 내용을 성공 저장했다고 표시하지 않는다. user text를 HTML에 raw 삽입하지 않도록 escape한다.

## 5. 개인정보·보안·접근성

- 사진, 얼굴, 번호판, 고객 이름/연락처, 주소, API 키, 현장 네트워크 정보를 수집하지 않는다.
- 입력 안내에서 개인/차량 식별정보를 쓰지 말라고 표시한다.
- 브라우저 데모 기록함의 저장/초기화/내보내기 범위를 알려준다. 클라우드 전송/모델 학습을 하지 않는다.
- 위험 징후 체크 시 제출 폼은 비활성화되고 안전 메시지를 키보드/스크린리더에 알린다. 사용자가 체크 해제해야 다시 데모 입력 가능.
- 위험 메시지는 모달 뒤에 숨기지 않고 페이지 상단의 `role=alert` 영역에 표시한다.
- 폼 오류는 해당 입력에 연결하고 focus 이동, label, 키보드 접근, Escape 동작을 지원한다.
- 모바일 360px에서 가로 스크롤 없음. 상태를 색만으로 표현하지 않는다.
- JSON 내보내기 파일명 `sonsecha-fault-preview-demo-YYYY-MM-DD.json`.

## 6. 인수 기준

- [ ] 카드가 구현 명세로 이동한다. 상단/폼/결과에 데모·실진단 아님이 보인다.
- [ ] 위험 징후 선택은 어떤 경우보다 우선해 즉시 안내하고 데모 결과 생성을 막는다.
- [ ] 미상 장비/기타/일치 사례 없음은 `판단 보류`로 처리한다.
- [ ] 일치 사례는 진단이 아니라 synthetic UX 예시임을 반복 표시한다.
- [ ] 원인/확률/수리 방법/장비 안전 판정 출력이 없다.
- [ ] 제출 이력의 저장/삭제/초기화/JSON export가 로컬에서 동작하고 외부로 전송하지 않는다.
- [ ] 입력값이 HTML로 실행되지 않는다. 오류/키보드/스크린리더 상태가 안내된다.
- [ ] `npm run build` 성공 및 `dist/ai-fault-diagnosis-app.html` 생성.
- [ ] 소스 검색상 AI provider, 이미지 업로드, 하드웨어 연결, 외부 진단 호출이 없다.

## 7. 실제 AI 파일럿을 위한 별도 승인 입력

정확 모델/사양, 사용권이 확보된 한국어 OEM 매뉴얼과 문서 버전, 안전 경고/금지 규칙, 고장 원인과 수리 결과를 승인할 자격 있는 전문가, 평가용 사례 분리 기준, 허용 가능한 판단 보류/오류 기준, 서버 측 모델 접근/로깅/데이터 삭제, 외부 AI 제공자와 보유/재학습/국외 이전 조건, 영상 마스킹 및 개인정보 처리 근거, 사람 검토·AS 에스컬레이션 운영이 정해져야 한다. 이 자료/정책 없이는 실제 생성형 AI 진단 기능 명세를 완성했다고 보지 않는다.

## 8. 근거

- [Cat Pumps troubleshooting](https://www.catpumps.com/troubleshooting), [서비스 매뉴얼 예시](https://www.catpumps.com/sites/default/files/2021-04/99MAN006A_67070.pdf): 특정 펌프 모델에서 증상별 가능 원인과 금지 조치가 존재함을 참고. 다른 모델에 일반화하지 않는다.
- [ISO 13379-1:2025](https://www.iso.org/standard/88027.html): 장비 상태감시·진단 접근은 적용 대상에 맞는 데이터와 방법이 필요하다는 점 참고.
- [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework), [valid and reliable AI characteristics](https://airc.nist.gov/airmf-resources/airmf/3-sec-characteristics/): 평가/운영 중 위험관리와 유효성 검토를 실제 AI 단계에서 따로 설계한다.
- [개인정보보호법](https://law.go.kr/lsLawLinkInfo.do?chrClsCd=010202&lsJoLnkSeq=900040612), [개인정보보호위원회 영상정보 AI 안내](https://pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS210&mCode=C020020000&nttId=10548): 사진/영상 데이터는 별도 개인정보 처리 검토가 필요할 수 있어 v1에서 수집하지 않는다.

이 근거는 이 데모의 진단 성능, 특정 장비 적합성 또는 실제 AI 사용의 법적 근거를 증명하지 않는다. 자료 확인일: 2026-11-09.

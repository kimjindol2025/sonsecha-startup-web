# 세차장 장비 원격관제 구현 명세 v1.0

> 원본 조사 기획: [01-remote-monitoring.md](./01-remote-monitoring.md)  
> 구현 대상: 현재 저장소 안에서 실행되는 **합성 데이터 기반 읽기 전용 MVP**  
> 하드웨어 연동: 제외. 제조사·모델·통신 사양이 확인된 뒤 별도 명세와 승인을 추가한다.

## 0. 구현자가 지켜야 할 결정

아래 결정은 Codex가 질문 없이 첫 구현을 시작할 수 있도록 고정한 v1 범위다.

| 항목 | v1 결정 |
|---|---|
| 실행 환경 | 기존 Vite 멀티페이지 웹 앱. GitHub Pages와 로컬 `npm run dev`에서 동작 |
| 진입 페이지 | 루트의 `remote-monitoring-app.html` |
| 기술 | 저장소의 기존 JavaScript, CSS, HTML 방식. 새 프레임워크나 패키지를 추가하지 않는다 |
| 데이터 | 명확하게 `데모 데이터`로 표시되는 고정 합성 데이터. 실고객·실장비 데이터는 넣지 않는다 |
| 저장 | 변경 가능한 데모 조치만 브라우저 `localStorage`에 저장. 브라우저와 기기 간 동기화는 제공하지 않는다 |
| 장비 연결 | 구현하지 않는다. PLC, Modbus, OPC UA, MQTT, 제조사 API, 게이트웨이로 연결·쓰기·제어하지 않는다 |
| 계정·권한 | 로그인이나 실제 권한 통제가 없는 공개 데모다. 역할 선택 UI도 만들지 않는다 |
| 알림 | 앱 안의 경보 목록만 제공. 문자, 이메일, 푸시, 자동 전화는 보내지 않는다 |
| 안전 | 전원/펌프/밸브/히터/리셋/운전값 명령과 안전 판단을 전부 제외한다. 모니터링 데모가 현장 점검이나 장비 안전장치를 대체한다고 표시하지 않는다 |

실제 원격관제 제품으로 오해하지 않도록 화면 상단에 **“데모 데이터 · 실제 장비 미연결”** 배지를 항상 표시한다. 이 문구는 화면 너비와 스크롤 위치에 관계없이 식별 가능해야 한다.

## 1. 완료 결과물과 파일

- `remote-monitoring-app.html`: 페이지 진입점, 한국어 문서 메타데이터와 앱 제목 포함
- `src/remote-monitoring.js`: 데이터 어댑터, 화면 렌더링, 검색/필터/상세/경보 확인/티켓/내보내기 동작
- `src/remote-monitoring.css`: 이 페이지 전용 반응형 스타일. 기존 `operations-apps` 페이지 스타일을 변경하지 않는다
- `vite.config.js`: 위 HTML을 멀티페이지 빌드 입력에 추가
- `carwash-app-catalog.html`: “세차장 장비 원격관제” 카드가 이 구현 명세와 앱 페이지로 연결되게 한다

앱 페이지에서 카탈로그로 돌아가는 링크를 제공한다. 새 페이지는 현재 `equipment-app.html`의 점검 이력 앱과 다른 앱이며 그 파일이나 동작을 바꾸지 않는다.

## 2. 사용자와 핵심 작업

v1은 점주 또는 매장 관리자가 데모에서 다음을 확인하는 흐름 하나를 완성한다.

1. 요약에서 정상/주의/장애/통신 끊김 장비 수와 최근 경보를 본다.
2. 장비를 지점, 상태, 검색어로 좁힌다.
3. 장비를 열어 합성 계측값, 최근 이벤트, 수신 시각을 확인한다.
4. 경보를 확인 처리하고 담당자 이름과 메모를 기록한다.
5. 경보에서 AS 티켓을 만들고 상태를 추적한다.
6. 현재 데모 데이터와 조치 이력을 JSON 파일로 내려받거나, 조치 이력을 초기 상태로 되돌린다.

이 화면에서 제공하지 않는 것: 다중 사용자 동시 작업, 실제 로그인/접근 제어, 실시간 센서 스트림, 지도, 장비 설정, 장비 명령, 실제 AS 발송, KPI를 이용한 고장 예측.

## 3. 화면 명세

### 3.1 공통 프레임

- 제목: `장비 원격관제`
- 보조 설명: `장비 상태와 장애 이력을 확인하는 데모입니다. 실제 장비와 연결되어 있지 않습니다.`
- 고정 식별 배지: `데모 데이터 · 실제 장비 미연결`
- 상단 링크: `앱 카탈로그로` → `./carwash-app-catalog.html`
- 주요 화면은 한 페이지에서 전환한다. 브라우저 주소 경로를 임의로 바꾸지 않는다.
- 초기 진입 화면은 `현황`이다. 새로고침 시 마지막으로 열린 상세 항목은 기억하지 않아도 된다.

### 3.2 현황 화면

1. 요약 카드 4개: `정상`, `주의`, `장애`, `통신 끊김`. 각 수는 현재 필터 적용 결과로 계산한다.
2. 최근 경보 목록 최대 5개. 열: 심각도, 장비, 경보 제목, 발생 시각, 확인 상태. 행을 누르면 해당 장비 상세의 경보 섹션으로 이동한다.
3. 장비 목록. 열: 지점, 장비명/모델, 현재 상태, 대표 측정값(값+단위), 마지막 수신, 미확인 경보. 모바일에서는 표를 카드형으로 재배치한다.
4. 지점 필터 기본 `전체 지점`, 상태 필터 기본 `전체 상태`, 검색은 장비명/모델/지점명을 대소문자 구분 없이 부분 일치한다.
5. 정렬 기본값은 미확인 장애, 주의, 통신 끊김, 정상 순서이며 같은 상태에서는 마지막 이벤트 최신 순이다.
6. 모든 필터 결과가 0건이면 빈 상태 문구와 `필터 초기화` 버튼을 보인다.

### 3.3 장비 상세 패널

- 장비명, 모델, 지점, 설치 위치, 장비 ID, 연동유형(`데모 시뮬레이터`), 현재 상태를 표시한다.
- 측정값 목록은 이름, 값, 단위, 측정 시각, 품질을 표시한다. 값이 없으면 `값 없음`; 품질이 나쁘거나 오래됐으면 정상값 색상으로 표시하지 않는다.
- 최근 이벤트 최대 20건을 최신순으로 보여준다. 이벤트가 없으면 명시적 빈 상태를 보인다.
- 이슈/경보를 선택하면 `확인 처리`, `AS 티켓 만들기`를 제공한다. 정상 상태 변경이나 장비 명령 버튼은 존재하면 안 된다.
- 데스크톱에서는 상세 패널, 모바일에서는 전체 폭 상세 뷰로 보이며 목록으로 돌아갈 수 있다.

### 3.4 경보 확인

`확인 처리` 버튼은 이름을 입력해야 활성화된다. 이름은 데모 감사 기록에만 저장된다.

- 메모는 선택이며 최대 500자. HTML 렌더링 시 문자열을 이스케이프한다.
- 저장 후 경보의 `acknowledgedAt`, `acknowledgedBy`, `acknowledgementNote`를 기록한다.
- 확인은 경보를 해결/정상화하지 않는다. 화면에 `확인됨 · 조치 완료 아님`으로 구분한다.
- 이미 확인된 경보는 재확인 대신 기록한 확인자와 시각을 표시한다.

### 3.5 AS 티켓 생성

경보 또는 장비 상세에서 모달/패널을 열어 티켓을 만든다.

필드:

| 필드 | 규칙 |
|---|---|
| 제목 | 필수, 3~100자. 기본값은 선택한 경보 제목 또는 `[장비명] 점검 요청` |
| 요청 내용 | 필수, 10~1000자 |
| 우선순위 | 필수: `긴급`, `높음`, `보통`, `낮음`. 기본 `보통` |
| 요청자 | 필수, 2~40자 |
| 연결 경보 | 현재 경보에서 열었다면 고정 연결. 장비 상세에서 열었다면 선택 가능 |

제출 후 `접수` 상태 티켓을 생성하고 성공 메시지를 보인다. 외부 업체나 기사에게 실제 전송되었다고 표현하지 않는다. 중복 제출을 막기 위해 저장 중 버튼을 비활성화한다.

티켓 상태 전이는 `접수 → 확인 중 → 현장 방문 예정 → 완료` 또는 `접수/확인 중 → 취소`만 허용한다. 완료/취소 후 상태를 다시 접수로 되돌리는 편집 기능은 v1에서 제외한다. 생성 시각, 변경 시각, 티켓 상태 이력을 저장한다.

### 3.6 데모 데이터 초기화/내보내기

- `데모 초기화`: 확인 대화상자를 거쳐 localStorage를 삭제하고 초기 합성 데이터를 다시 불러온다.
- `JSON 내보내기`: 현재 데모 장비/경보/확인 기록/티켓을 UTF-8 JSON으로 다운로드한다. 파일명은 `sonsecha-remote-monitoring-demo-YYYY-MM-DD.json` 형식이다.
- JSON 내보내기에는 사용자 브라우저의 다른 데이터, 인증값, 환경 변수, 쿠키를 포함하지 않는다.
- 손상되었거나 지원하지 않는 스키마 버전이면 파싱 에러를 화면에 노출하지 않고 기본 데이터 복구 안내 후 초기 데이터를 사용한다.

## 4. 상태·시간·경보 규칙

### 4.1 장비 상태 우선순위

`장애 > 통신 끊김 > 주의 > 정상 > 알 수 없음`

- 합성 fixture에서 주어진 장비 상태는 샘플임을 표시하고 그대로 그린다.
- 실제 어댑터 구현 전에는 이 앱이 값을 생성하거나 장비 상태를 추론하지 않는다.
- 실제 데이터 계약에서 마지막 수신 이후 120초 초과는 `통신 끊김` 후보값으로 둔다. 이는 파일럿 시작값이며 제품 운영 전 장비별 주기와 현장 조건에 맞게 결정해야 한다.
- 수신 데이터가 전혀 없거나 품질이 `bad/unknown`이면 `정상`으로 대체 금지. `알 수 없음`으로 표시한다.
- 통신 끊김은 장비 고장과 다른 상태다. 통신 끊김이 발생해도 이전 측정값을 최신값처럼 보이지 않게 한다.

### 4.2 경보 우선순위와 생명주기

- 경보 심각도: `critical`, `warning`, `info`를 각각 `긴급`, `주의`, `정보`로 표현한다.
- 경보 상태: `open`, `acknowledged`, `resolved`, `dismissed`.
- 기본 리스트에는 해결/무시 전 상태를 표시한다. 확인됨 경보를 자동 해결 처리하지 않는다.
- `resolved`와 `dismissed` 기능은 샘플에만 보여 줄 수 있으나 v1에서 사용자 버튼으로 전이시키지 않는다. 명시적인 구현 요구가 생기기 전까지 임의의 해결 판단을 만들지 않는다.
- 동일 원천의 반복 알림은 `sourceEventId` 기준으로 중복 생성하지 않는다.

### 4.3 시간 규칙

- 저장/JSON 값은 ISO 8601 UTC 문자열(예: `2026-11-09T00:00:00.000Z`)을 사용한다.
- 화면 표시는 `Asia/Seoul` 기준 `YYYY-MM-DD HH:mm:ss`로 한다.
- `measuredAt`(장비 측정시각)과 `receivedAt`(앱 수신시각)을 분리한다.
- 측정시각이 수신시각보다 미래거나 파싱 불가인 값은 품질 오류로 표시한다.
- 오늘 날짜 산출은 UTC 날짜 자르기가 아니라 `Asia/Seoul`을 기준으로 일관되게 계산한다.

## 5. 데이터 계약

모든 레코드는 `id`를 갖는다. 데모 스토어는 버전 필드를 포함하며 `sonsecha.remote-monitoring.demo.v1` 키 하나에 원자적으로 JSON 저장한다.

```ts
type EquipmentStatus = 'normal' | 'warning' | 'fault' | 'offline' | 'unknown';
type Quality = 'good' | 'uncertain' | 'bad' | 'unknown';
type Severity = 'critical' | 'warning' | 'info';
type AlertStatus = 'open' | 'acknowledged' | 'resolved' | 'dismissed';
type TicketStatus = 'received' | 'reviewing' | 'visit_scheduled' | 'completed' | 'cancelled';

interface Site {
  id: string; name: string; displayAddress: string;
}
interface Equipment {
  id: string; siteId: string; name: string; manufacturer: string;
  model: string; installedAt: string | null; locationLabel: string;
  integrationType: 'demo'; status: EquipmentStatus; lastSeenAt: string | null;
}
interface Measurement {
  id: string; equipmentId: string; metricKey: string; label: string;
  value: number | string | null; unit: string; measuredAt: string;
  receivedAt: string; quality: Quality; source: 'demo';
}
interface EquipmentEvent {
  id: string; sourceEventId: string; equipmentId: string;
  type: 'status' | 'fault' | 'connectivity' | 'inspection';
  code: string; title: string; detail: string; occurredAt: string;
  receivedAt: string; severity: Severity;
}
interface Alert {
  id: string; sourceEventId: string; equipmentId: string; siteId: string;
  severity: Severity; title: string; detail: string; status: AlertStatus;
  occurredAt: string; acknowledgedAt: string | null;
  acknowledgedBy: string | null; acknowledgementNote: string;
}
interface Ticket {
  id: string; equipmentId: string; alertId: string | null; title: string;
  description: string; priority: 'urgent' | 'high' | 'normal' | 'low';
  requester: string; status: TicketStatus; createdAt: string; updatedAt: string;
  history: Array<{ status: TicketStatus; changedAt: string; changedBy: string }>;
}
interface DemoStore {
  schemaVersion: 1; sites: Site[]; equipment: Equipment[];
  measurements: Measurement[]; events: EquipmentEvent[];
  alerts: Alert[]; tickets: Ticket[];
}
```

초기 데이터는 가상 `데모 세차장 A/B` 2곳, 장비 5대(정상 2, 주의 1, 장애 1, 통신 끊김 1), 경보 4건(미확인 3, 확인 1), AS 티켓 1건으로 고정한다. 브랜드 실장비를 연상시키는 모델명, 실주소, 실연락처를 쓰지 않는다. 측정 단위는 샘플에 표시되는 설명용 값일 뿐 정상범위나 안전한계로 해석할 수 없다는 툴팁을 제공한다.

측정값 예시 항목은 `run_state`(상태, 단위 없음), `pressure`(bar), `temperature`(°C), `water_level`(%)로 제한한다. 샘플 수치가 안전기준을 뜻하지 않으며 자동 임계 판정에는 사용하지 않는다.

### 5.1 어댑터 경계

화면 코드는 localStorage를 직접 다루지 않는다. `demoMonitoringAdapter`가 다음 Promise API를 제공한다.

```ts
listSites(): Promise<Site[]>
listEquipment(filters?: { siteId?: string; status?: EquipmentStatus; query?: string }): Promise<Equipment[]>
getEquipmentDetail(equipmentId: string): Promise<{ equipment: Equipment; measurements: Measurement[]; events: EquipmentEvent[]; alerts: Alert[] }>
listAlerts(filters?: { status?: AlertStatus; siteId?: string }): Promise<Alert[]>
acknowledgeAlert(input: { alertId: string; name: string; note: string }): Promise<Alert>
createTicket(input: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'history' | 'status'>): Promise<Ticket>
updateTicketStatus(input: { ticketId: string; status: TicketStatus; changedBy: string }): Promise<Ticket>
resetDemo(): Promise<void>
exportSnapshot(): Promise<DemoStore>
```

이 인터페이스는 나중에 검증된 서버/게이트웨이 어댑터로 바꾸기 위한 앱 내부 경계일 뿐, 외부 HTTP API가 존재한다는 약속이 아니다. 데모 어댑터 구현은 고정 seed와 localStorage만 사용한다.

## 6. 검증과 입력 오류 처리

- 필터는 상태/지점 조합으로 적용되고 검색 문자열이 공백이면 검색을 해제한다.
- 티켓 필수 입력 누락, 길이 초과, 우선순위 누락은 필드 근처 한국어 메시지로 표시하고 제출하지 않는다.
- 확인자 이름 공백 또는 1자면 경보 확인을 저장하지 않는다.
- localStorage 쓰기 실패(용량/브라우저 제한) 시 성공 상태를 표시하지 않는다. `이 브라우저에 저장하지 못했습니다. 데모 초기화 또는 JSON 내보내기를 시도하세요.`를 안내한다.
- 같은 `sourceEventId`의 동일 경보는 한 건만 유지한다.
- 모달 열림 시 포커스를 첫 입력으로 이동하고, 닫으면 연 버튼에 포커스를 돌려준다. Escape와 취소 버튼으로 닫을 수 있다.
- 새로고침 뒤 티켓/확인 기록이 유지되는 것은 같은 브라우저에서만 보장한다.
- 모든 사용자 입력은 HTML escape 처리하고 `innerHTML` 삽입 때 사용자 입력을 생 문자열로 넣지 않는다.

## 7. 접근성·반응형·시각 상태

- 언어 `ko`, 모든 입력에 보이는 label, 버튼에 명확한 이름을 제공한다.
- 상태는 색상만으로 구분하지 않는다. 아이콘/텍스트(`정상`, `주의`, `장애`, `통신 끊김`, `알 수 없음`)를 함께 표시한다.
- 키보드만으로 필터, 장비 행, 상세 닫기, 경보 확인, 티켓 입력과 제출이 가능해야 한다.
- 모바일 기준 360px 폭에서 가로 페이지 스크롤이 없어야 한다. 태블릿/데스크톱은 콘텐츠가 읽기 쉽게 확장된다.
- 로딩, 빈 상태, 저장 오류, 저장 성공 상태를 각각 제공한다.
- 모션은 필수 정보에 사용하지 않고 `prefers-reduced-motion` 설정을 존중한다.

## 8. 구현 순서

1. 타입/상태 enum, seed 데이터, 버전형 데모 스토어, localStorage 오류/초기화/내보내기
2. 앱 셸과 공통 데모 식별, 반응형 현황 화면 및 필터
3. 장비 상세, 측정값 품질·시각 표시, 이벤트 타임라인
4. 경보 확인 기록과 티켓 생성/허용된 상태 전이
5. 카탈로그 연결 및 키보드·모바일·오류 상태 검증

## 9. 완료 조건(인수 기준)

Codex는 구현 완료 후 이 항목을 모두 직접 확인하고 결과를 보고한다.

- [ ] 카탈로그의 원격관제 카드에서 앱으로 이동하고, 앱에서 카탈로그로 돌아간다.
- [ ] 페이지 상단과 좁은 화면에서도 데모/미연결 고지가 보인다.
- [ ] 초기 fixture 합계가 정상 2, 주의 1, 장애 1, 통신 끊김 1이며 지점·상태·텍스트 필터가 조합 동작한다.
- [ ] 장비 상세에 가짜 측정값의 단위/품질/측정시각/수신시각이 구분된다.
- [ ] 경보 확인은 이름 필수이며 재확인 방지, 확인자/시각 표시, 미해결 유지가 동작한다.
- [ ] 티켓 입력 검증, 생성, 허용된 상태 전이, 상태 이력이 동작하고 새로고침 후 보존된다.
- [ ] 초기화는 확인을 거치고 seed 상태로 복원되며 JSON 내보내기 형식/파일명이 맞다.
- [ ] 알 수 없는/오래된/품질 불량 데이터를 정상으로 오표시하지 않는다.
- [ ] 새 페이지 외 기존 앱들의 빌드 산출물과 동작은 바뀌지 않는다.
- [ ] 소스 검색 기준 실제 PLC/Modbus/OPC UA/MQTT 연결, 네트워크 제어, 외부 알림 발송 코드가 추가되지 않았다.
- [ ] `npm run build`가 성공하고 `dist/remote-monitoring-app.html`이 생성된다.

## 10. 실제 장비 연결 후속 명세에 필요한 입력

아래 자료 없이는 실제 하드웨어 연동 구현을 시작하지 않는다.

1. 파일럿 지점 및 소유자/운영자 승인
2. 제조사, 정확한 장비 모델/펌웨어, 매뉴얼과 보증 조건
3. 제조사 승인 통신 방식, 읽기 전용 계정/노드/레지스터 allowlist와 데이터 사전
4. 장비별 측정 주기·단위·정상범위 출처·오류코드와 현장 대응 절차
5. 게이트웨이 설치/망 분리/인증서 교체/업데이트/장애 대응 담당자
6. 데이터 소유권, 보존기간, 사용자/지점 권한, 운영 알림 수신 규칙
7. 전파·전기·산업안전 적용 검토 책임자와 현장 설치 승인

실제 OT 연결 단계에서는 클라우드가 PLC에 직접 접속하지 않는다. 승인된 현장 게이트웨이가 필요한 텔레메트리만 외부로 전달하는 구조를 우선 검토한다. OPC UA 프로파일을 쓰더라도 읽기만 허용되는 것은 아니므로 허용 NodeId 외 읽기 차단, Write/Call 미노출, 인증서 및 사용자 권한 검증을 별도로 한다. MQTT QoS 1 같은 재전달 가능 경로에서는 `sourceEventId` 중복 방지와 측정/수신시각 분리를 유지한다.

## 11. 근거와 한계

- [CISA, Configuring and Managing Remote Access for Industrial Control Systems](https://www.cisa.gov/sites/default/files/recommended_practices/RP_Managing_Remote_Access_S508NC.pdf): OT 원격 접속은 가용성과 무결성 위험을 고려해 시스템별로 설계해야 한다. v1은 실연결을 제외하며 후속 설계에서 현장 게이트웨이, 분리된 네트워크, 승인된 최소 접근을 검토한다.
- [NIST SP 800-82 Rev. 3, Guide to Operational Technology Security](https://csrc.nist.gov/pubs/sp/800/82/r3/final): OT 고유의 신뢰성·성능·안전 요구를 보안 설계에 반영해야 한다. 2026년 9월 현재 Rev. 4는 초안이므로 이 문서는 최종본인 Rev. 3를 기준 자료로 사용한다.
- [OPC Foundation, OPC UA](https://opcfoundation.org/about/opc-technologies/opc-ua/), [OPC UA Part 2 Security Model](https://reference.opcfoundation.org/specs/OPC-10000-2/4.1): 인증/권한/보안은 구성에 따라 달라지므로 프로토콜 이름만으로 안전성을 가정하지 않는다.
- [OASIS MQTT Version 5.0](https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html): 전달 품질 및 메시지 중복 가능성을 실제 어댑터 설계 시 고려한다. v1에는 MQTT 클라이언트가 없다.
- [국가법령정보센터, 산업안전보건법 시행규칙](https://law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lspttninfSeq=154263): 적용 장비/현장에 필요한 안전장치와 책임은 장비·사업장 조건으로 검토한다. 이 앱은 안전장치, 법정 점검, 현장 점검을 대체하지 않는다.

위 출처는 설계 유의점이지 세차장 특정 모델의 호환성, 법률 적합성, 인증 면제 또는 사고 예방 효과를 증명하지 않는다. 1차 자료 최종 확인일: 2026-11-09.

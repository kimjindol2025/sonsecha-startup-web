# 본사 AS 배차 구현 명세 v1.0

> 조사 초안: [02-hq-service-dispatch.md](./02-hq-service-dispatch.md)  
> MVP: 가상 접수·수동 배정·작업 보고의 **합성 데이터 데모**  
> 실제 기사·가맹점·위치정보·AS 통신과 결제는 미연결.

## 0. 구현 결정

- 진입 `hq-service-dispatch-app.html`; 코드 `src/hq-service-dispatch.js`, `src/hq-service-dispatch.css`; Vite 기존 설정/Vanilla JS/CSS 사용.
- 상시 표시 `데모 티켓 · 실제 AS/기사 미연결`; 모든 지점/기사/작업은 가상.
- 흐름: 신규 접수 → 본사 분류 → 기사 수동 지정 → 기사 상태/작업 보고 입력 → 본사 검토 데모.
- 역할은 `접수자 데모 / 디스패처 데모 / 기사 데모` 화면 전환만 한다. 실인증/권한 보안이 아니다.
- 기사 위치/GPS/ETA, 전화·문자·푸시, 이메일, 사진/서명, 재고, 견적/결제/세무, 실제 가맹점 정보, 지도/외부 API는 구현하지 않는다.
- seed 데이터는 브라우저에서만 수정·저장한다. 새 티켓과 보고는 실제 사람이나 업체에 전달되지 않는다.
- 위험 신고 선택은 작업 배정을 막고 안내만 보인다. 앱은 안전 판단자나 긴급 구조 도구가 아니다.

카탈로그의 `본사 AS 배차` 링크를 이 상세 명세로 바꾼다.

## 1. 사용자 흐름

### 접수자 데모

새 티켓을 생성한다. 필수: 데모 지점, DEMO 장비, 증상 범주, 문제 설명, 발생 시작 시점, 영향(`서비스 중단/일부 제한/확인 요청`), 위험 징후(`없음/의심`). 선택: 오류 코드(최대 40자), 방문 가능일 2개(향후 30일 내), 접수자 표시명. 연락처/주소는 입력받지 않는다.

위험 의심 선택 시 “배차 데모를 진행하지 않습니다. 해당 사업장의 비상 절차와 장비 매뉴얼을 따르고 자격 있는 책임자에게 연락하세요.”를 보이고 신규 티켓은 `safety_hold`로 저장하며 배정 버튼은 없다.

### 디스패처 데모

접수 큐를 우선순위/신규순으로 확인하고 분류(중복/추가정보 필요/배정 가능/안전보류), 우선순위, 가상 기사, 방문 날짜를 수동으로 선택한다. 자동 추천·실제 응답시간/SLA 보장은 없다. 기사 미선택 또는 가능한 날짜 미선택이면 배정 저장을 막는다.

### 기사 데모

배정된 티켓을 열고 수락/거절(사유 3~300자), 작업 상태(`예약/이동/현장도착/작업중/작업완료보고`)와 기록(관찰 결과/수행했다고 입력한 데모 조치/후속 필요)을 남긴다. 작업 중 위험 징후를 선택하면 보고 저장 전 안전보류로 전환하고 안전 안내를 우선 표시한다. 실제 위치, 현장 사진, 차량/고객정보는 없다.

### 완료 검토

본사 데모는 기사 보고를 `확인`, `보완 요청`, `예시 종결` 중 선택한다. 보완 요청 사유 3~300자 필수. 완료 기록을 수정/삭제하지 않고 보완 이벤트를 append한다. 예시 종결은 `데모 종료`임을 표시한다. 청구 자료나 비용은 만들지 않는다.

## 2. 화면

- 탭 `티켓 대시보드`, `접수`, `기사 배정`, `작업 보고`, `데모 설정/초기화`.
- 상단 KPI: 미분류, 배정 대기, 방문 예정, 기사 보고 대기, 안전보류.
- 필터: 티켓 상태, 우선순위, 지점, 기사, 검색(티켓ID/장비/증상). 상태 우선순위 `안전보류 > 긴급 > 높음 > 보통 > 낮음 > 신규순`.
- 목록: ID, 가상 지점, DEMO 장비, 증상, 영향, 우선순위, 상태, 담당 기사, 방문일. 모바일은 카드형.
- 상세 타임라인은 접수/분류/배정/수락·거절/상태/보고/검토 이벤트를 최신순으로 표시한다. 이벤트 시간은 한국 시간으로 보여준다.
- 상단 고정 배지: `합성 데이터 · 연락/위치/AS 전송 없음`.
- 역할 미리보기 selector는 화면 예시만 바꾼다. 선택된 역할 데이터가 보호된다고 주장하지 않는다.
- 데모 상태 초기화와 JSON 내보내기를 제공한다.

## 3. 상태 전이

```text
new → triage → awaiting_info → dispatchable → assigned → accepted
assigned → declined → dispatchable
accepted → scheduled → en_route → on_site → in_progress → report_submitted → hq_review
hq_review → revision_requested → in_progress
hq_review → demo_closed
any pre-close state → cancelled (reason required)
new/triage/dispatchable + hazard flag → safety_hold (no assignment)
```

- 상태를 바꾸는 버튼은 현재/다음 허용 상태에 따라 표시한다. 임의 상태 편집 UI를 만들지 않는다.
- assigned/accepted 이후 기사 재배정은 현재 배정 취소 사유를 남기고 `dispatchable`로 돌아간 다음 새 배정을 만든다.
- 모든 전이는 `statusEvents[]` append; 기존 이벤트 수정/삭제 금지.
- `urgent/high`는 데모 우선도 값일 뿐 응답시간 약속이나 실제 긴급도 판정이 아니다.
- 방문일은 한국 현지 날짜, 미래 30일 이내. 완료 보고 시 결과 10~1000자, 작업자 2~40자 필수. 작업비/parts/현장 사진 불포함.

## 4. 고정 seed 및 배정 규칙

가상 지점 4, 장비 8, 기술자 4(권역 label과 가상 기술태그), 티켓 8을 초기 제공한다. 상태별 샘플은 신규 2, 배정대기 1, 방문예정 2, 작업보고 대기 1, 본사검토 1, 안전보류 1. 이름은 `데모 기사 A` 등. 지도 좌표/전화번호 없음.

기사는 디스패처의 수동 목록 선택만 허용한다. 표시 필드: 가상 기사명, 권역 레이블, 태그, 데모 가용(`가능/불가`). 권역/태그 일치를 계산해 “적격”이라고 단정하거나 자동 점수화하지 않는다. 배정 후 기사 역할 미리보기에 티켓이 보인다.

## 5. 데이터와 저장

local key `sonsecha.hq-dispatch.demo.v1`, `schemaVersion: 1`.

```ts
type TicketStatus = 'new'|'triage'|'awaiting_info'|'dispatchable'|'assigned'|'accepted'|'declined'|'scheduled'|'en_route'|'on_site'|'in_progress'|'report_submitted'|'hq_review'|'revision_requested'|'demo_closed'|'cancelled'|'safety_hold';
interface DemoTicket {
  id: string; siteId: string; equipmentId: string; symptomKey: string;
  description: string; impact: 'service_down'|'limited'|'check';
  severity: 'urgent'|'high'|'normal'|'low'; hazard: boolean;
  createdAt: string; preferredDates: string[]; status: TicketStatus;
  technicianId: string | null; visitDate: string | null;
  statusEvents: Array<{ from: TicketStatus|null; to: TicketStatus; actor: string; at: string; note: string }>;
  workReport: { worker: string; observation: string; demoAction: string; followUp: string; submittedAt: string } | null;
}
interface DemoTechnician { id: string; displayName: string; regionLabel: string; skillLabels: string[]; availability: 'available'|'unavailable' }
```

API 경계 `demoDispatchAdapter`: `listTickets(filters)`, `getTicket(id)`, `createTicket(input)`, `triageTicket(input)`, `assignTechnician(input)`, `respondToAssignment(input)`, `transitionTicket(input)`, `submitWorkReport(input)`, `reviewWorkReport(input)`, `requestRevision(input)`, `resetDemo()`, `exportSnapshot()`. Promise 기반이고 HTTP/위치 API를 호출하지 않는다. 이벤트 append와 상태 변경은 하나의 localStorage 스냅샷에서 함께 저장한다.

모든 시각 ISO 8601 UTC 저장, Asia/Seoul 표시. `createdAt`/이벤트 시각이 미래로 입력되면 거부한다. ID는 `TKT-DEMO-####` 형태의 중복되지 않는 데모 ID.

## 6. 오류/보안/접근성

- 사용자 텍스트를 escape한다. localStorage 오류 시 변경 성공 토스트 금지.
- 같은 동작 연속 제출을 막는다. 존재하지 않는 기사/티켓/상태 변경은 오류 안내.
- 안전보류는 우선순위 최상단, 배정 CTA 숨김, 키보드/스크린리더 알림.
- 360px 반응형, 표를 카드로 재배치, 색+텍스트+아이콘으로 상태 표시.
- label, 필드 인접 검증, 포커스 이동/복귀, Escape 취소, reduced motion.
- 개인 연락처, GPS/주소, 사진, 서명, 실제 고객 정보, 청구 금액을 요구/저장하지 않는다.
- JSON export `sonsecha-dispatch-demo-YYYY-MM-DD.json`; reset 전 확인.

## 7. 인수 기준

- [ ] 카탈로그 상세 링크와 앱 페이지 간 이동.
- [ ] 데모/연락·위치 미연결 고지가 공통 레이아웃에 표시.
- [ ] seed KPI/상태별 티켓 수 일치, 필터/검색 동작.
- [ ] 티켓 생성→분류→수동배정→수락/거절→작업 보고→검토/보완/데모종결 전이만 허용.
- [ ] 안전 신고 티켓은 배정 불가 상태로 저장되고 모든 화면에서 알림이 우선 표시.
- [ ] 상태 이벤트 타임라인과 기사 보고가 새로고침 뒤 유지.
- [ ] 취소/재배정 사유, 검토 보완 사유 필수 검증.
- [ ] 모바일/키보드/빈 상태/저장 실패/초기화/export 확인.
- [ ] `npm run build` 성공 및 `dist/hq-service-dispatch-app.html` 생성.
- [ ] 위치/GPS, 외부 메시지, 사진, 결제, 자동배차/실제 기사 데이터 연결이 코드에 없다.

## 8. 실제 운용 전 합의

티켓 접수 필드/고객 고지, 위험 긴급도와 안전 책임자/에스컬레이션, 협력사 계약과 기사 인증/기술 자격, 지점·기사·협력사 역할 권한, 개인정보·사진 보유, 위치정보 수집 필요성/동의·목적·보유기간, 시간 외 대응, 실제 예약/출장비/보증 승인, 오프라인 작업/중복 제출, 서버 인증·감사·백업을 정해야 한다. 위치는 v1 밖이며 위치 공유가 필요한 실제 근거와 최소 수집안을 별도로 승인받기 전에는 추가하지 않는다.

## 9. 근거와 한계

- [Microsoft Field Service work order lifecycle](https://learn.microsoft.com/en-us/dynamics365/field-service/work-order-status-booking-status) 및 [service report](https://learn.microsoft.com/en-us/dynamics365/field-service/mobile/create-service-report): 업무상태와 현장보고 흐름 참고용 사례.
- [ServiceNow field service dispatch](https://www.servicenow.com/docs/r/field-service-management/field-service-scheduling/scheduling-and-dispatching-agents.html): 수동/기술기반 배정 기능 사례 참고.
- [개인정보 보호법 제16조·제29조](https://law.go.kr/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1020399353), [위치정보법 제15·16·18조](https://law.go.kr/LSW/lsInfoP.do?lsiSeq=272841): 실제 수집 주체/방법에 따라 적용 검토가 필요하다.

이 자료는 한국의 특정 AS 계약/운영 관행이나 위치정보 처리 적법성을 결정하지 않는다. 자료 확인일: 2026-11-09.

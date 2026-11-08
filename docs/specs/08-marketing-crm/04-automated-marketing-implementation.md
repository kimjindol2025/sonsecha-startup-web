# 세차장 자동 마케팅 구현 명세 v1.0

> 조사 초안: [04-automated-marketing.md](./04-automated-marketing.md)  
> MVP: 날씨/방문 조건을 검토해 캠페인 초안을 만들고 승인 흐름을 보는 **가상 데이터 데모**  
> 실제 날씨 API, 고객 데이터, 예약 발송, 메시지 전송은 포함하지 않는다.

## 0. 절대 지킬 범위

- 진입 `automated-marketing-app.html`; 코드 `src/automated-marketing.js`, `src/automated-marketing.css`; 저장소의 기존 Vite/Vanilla JS/CSS.
- 항상 표시 `자동 마케팅 데모 · 가상 날씨/고객 · 메시지 미발송`.
- 날씨/대기/고객/지점 데이터 전부 가상 fixture. 기상청·에어코리아 API 키/실제 위치/실측을 넣지 않는다.
- 세그먼트 초안/대상 수/제외 이유/광고문구 preview/승인 기록만 구현한다.
- 실제 사람에게 SMS/이메일/push/카카오 메시지 발송·예약·재시도·실제 전송 API, recipient export, 연락처 수집은 없다.
- v1은 automatic rule을 실제 실행하거나 캠페인을 예약하지 않는다. 규칙 조건을 가상 입력값에 대해 계산한 “데모 미리보기”만 한다.
- 실제 동의/수신거부를 받거나 법적 준수 여부를 승인하지 않는다. 모든 상태는 합성 consent snapshot.
- 역할 selector는 HQ 마케팅/승인자/지점 화면을 바꾸는 데모일 뿐 실제 인증·승인권한이 아니다.
- 신규 의존성, 백엔드/외부 API 연결 추가 금지.

## 1. 사용자 흐름

1. 본사 마케팅 데모 사용자가 지점, 캠페인 규칙, 채널, 기간을 선택한다.
2. 가상 forecast의 발행시각과 유효시간, 가상 지점 영업상태를 확인한다.
3. 시스템이 matching 가상 프로필 수와 제외 사유별 인원 집계만 보여준다. 실제 대상자 명단은 표시하지 않는다.
4. 광고 template에 매장명, 제안 문구, opt-out 안내 예시를 입력해 preview한다.
5. 승인자 데모가 내용, 채널, 대상 수, suppression 수, 고지 예시를 재검토하고 승인 또는 반려한다.
6. 상태가 `승인 기록됨 · 전송하지 않음`으로 남는다.
7. 지점 데모는 해당 가상 지점의 캠페인 요약/비용 예상(가상 단위)을 확인한다.

## 2. 화면과 세부 동작

### 대시보드

제목 `자동 마케팅`; 데모/미발송 badge; 카탈로그 복귀. KPI는 `데모 초안`, `승인 기록`, `동의 없음 제외`, `기상 자료 미사용/오래됨으로 중단` 등 현재 seed 계산값. 실제 광고 성과나 매출 효과를 표시하지 않는다.

### 캠페인 작성 4단계

**A. 대상 지점/규칙**

- 지점 1개 이상; 운영 상태(`운영 중 데모/휴점 데모`); campaign type `장기 미방문 데모`, `비 예보 데모`, `쿠폰 안내 데모`.
- 장기 미방문 기준은 30일 이상. 데이터가 없으면 대상에서 제외.
- 비 예보 규칙: 향후 6시간 가상 강수확률 ≥60%일 때만 `condition_matched`. 이 임계치는 UX fixture용이며 마케팅 적합/실제 날씨 예측이 아님.
- 쿠폰 안내 데모는 캠페인 작성 폼에 coupon id 선택 필요. 하지만 쿠폰/메시지 실제 발급/발송은 없다.
- dust/미세먼지 trigger는 v1 UI에서 제공하지 않는다.

**B. 채널/대상 자격 미리보기**

채널 1개 선택: `SMS 데모`, `이메일 데모`, `앱 푸시 데모`. 선택 채널의 `purpose=marketing`, `state=granted`, `withdrawnAt=null`, notice version/시간이 존재하는 가상 프로필만 candidate. 철회, 동의 누락/미확인, 삭제 프로필, 지점 휴점, 데이터 기준 날짜 불일치, 쿨다운 적용 대상은 제외한다.

미리보기에는 조건에 부합한 가상 인원, 제외 사유별 count, 테스트 fixture 이름이 아닌 aggregate만 표시한다. 개별 연락처/프로필 ID list, CSV export, 복사 버튼이 없다.

**C. 메시지 작성/미리보기**

필드: 캠페인명 3~80자, 메시지 10~300자(SMS 데모)/10~2000자(email 데모)/10~300자(push 데모), 광고 템플릿 label, 발신 지점 표시명, 수신거부 안내 예시(5~100자), 내부 목적/근거 메모(10~300자). 메시지 내 템플릿 변수는 `{branchName}`, `{offerLabel}`만 허용, 그 밖의 braces는 오류. 미리보기에 실제 발신/수신 대상이 아닌 가상 phone/email이 표시되면 안 된다.

**D. 검토/승인 기록**

검토 항목: 동의 snapshot 확인, 철회/unknown 제외 확인, 채널·광고 고지 확인, 매장 운영 상태 확인, frequency cap preview, 가상 문구 검토. 하나라도 체크 안 하면 `검토 요청`을 만들 수 없다. reviewer 표시명 2~40자/결정 메모 필수.

- 전이: `draft → review_requested → approved_demo` 또는 `review_requested → rejected_demo`; draft/review_requested는 cancel 가능.
- 승인된 캠페인은 수정 불가. 수정할 경우 원본과 연결된 새 draft 생성.
- 승인 메시지: `데모 승인 기록 · 실제 발송/예약 없음`.
- 어떠한 시간/상태에서도 발송 API 버튼·예약일·queued/sent 상태가 존재하지 않는다.

## 3. 규칙/조건 및 fail-closed

미리보기 계산 시 전부 충족해야 eligibility를 얻는다.

1. `condition_matched = true`; 예보 trigger는 `publishedAt`이 현재보다 미래가 아니고, 나이 ≤6h, forecast 유효구간이 선택된 6h 창과 겹쳐야 한다.
2. 지점 운영 상태가 `open`.
3. 대상 지점과 프로필의 branch id 일치.
4. 목적/선택 channel의 합성 동의가 `granted`, 문구 version 및 이벤트 시각이 존재.
5. 가장 최근 해당 프로필/지점 마케팅 데모 활동 후 7일 이상. 최근 기록 없으면 eligible. 중복 캠페인 draft/review/approved 대상 중복은 1명으로 dedupe.
6. 가상 현지시간이 08:00~20:00 사이. 그 밖에는 `send_time_window` 제외. 이 값은 demo policy이며 현행 법적 기준/채널 정책을 대체하지 않는다.
7. campaign당 최대 20명의 합성 후보. 초과 시 가상 고객 ID hash 정렬 기준 상위 20명만 candidate, 초과 count는 `demo_cap`으로 제외. 실제 target ID는 UI에서 감춘다.

예보 stale, API/값 없음, 매핑 불가, 동의 source 불명, 지점 휴점, clock 오류이면 eligible 0명과 fail-closed 이유를 보인다. 실제 fallback/수동 발송은 제공하지 않는다.

## 4. 결정적 데모 데이터

가상 지점 2곳, 가상 weather snapshot 3개: 새 예보/강수 조건 일치(1시간 전), 오래된 예보(8시간 전), 예보 오류 1건. 가상 고객 20명과 최근 방문/채널동의/철회 상태, 캠페인 초안 3개를 seed한다. dates는 한국 오늘 기준 상대 계산으로 freshness, inactive 기간, time window의 각 경계를 안정적으로 보여준다. 모든 날씨 값은 `synthetic: true`, region label `DEMO-GRID-A/B`.

UI는 seed clocks를 고정 `demoNow` 값을 사용해 결정적 예시를 보여준다. 현재 실시간/시각에 따라 랜덤으로 결과가 달라지지 않는다. `기준 시각 이동` control로 `08:00/13:00/21:00` preset을 고르면 preview 제외 사유가 재계산된다.

## 5. 데이터 계약

Storage key `sonsecha.automated-marketing.demo.v1`, envelope `schemaVersion: 1`.

```ts
type Channel = 'sms'|'email'|'push';
type CampaignStatus = 'draft'|'review_requested'|'approved_demo'|'rejected_demo'|'cancelled';
interface DemoForecast { id: string; branchId: string; regionGrid: string; type: 'rain'; probabilityPercent: number|null; publishedAt: string; validFrom: string; validUntil: string; quality: 'good'|'stale'|'missing'|'error'; synthetic: true }
interface DemoBranch { id: string; name: string; status: 'open'|'closed'; regionGrid: string; synthetic: true }
interface DemoProfile { id: string; branchId: string; alias: string; lastVisitAt: string|null; deletedAt: string|null; synthetic: true }
interface MarketingConsent { id: string; profileId: string; purpose: 'marketing'; channel: Channel; state: 'granted'|'withdrawn'|'unknown'; noticeVersion: string|null; occurredAt: string|null; synthetic: true }
interface CampaignDraft { id: string; name: string; type: 'inactive_30'|'rain_demo'|'coupon_demo'; branchIds: string[]; channel: Channel; body: string; senderLabel: string; optOutExample: string; status: CampaignStatus; createdAt: string; updatedAt: string; consentSnapshotVersion: number; eligibleCount: number; excludedCounts: Record<string,number>; reviewer: string|null; reviewNote: string; events: Array<{from: CampaignStatus|null; to: CampaignStatus; actor: string; at: string; note: string}>; transmitted: false }
```

`demoAutoMarketingAdapter`: `getDashboard()`, `listCampaigns(filters)`, `previewCampaign(input, demoNowPreset)`, `saveCampaignDraft(input)`, `requestReview(id,input)`, `approveDemo(id,input)`, `rejectDemo(id,input)`, `cancelDraft(id)`, `cloneDraft(id)`, `resetDemo()`, `exportSnapshot()`. Promise interface; fetch/network API 금지. eligibility preview는 ID 명단을 반환하지 않고 aggregate와 suppressed reason count만 넘긴다.

## 6. 오류·권한·접근성

- 모든 campaign 본문/user input escape. 빈/invalid token/분모 0/날짜 오류는 preview 중단.
- 동의 또는 preview snapshot 변경 후 reviewer 화면에서 경고하고 승인 상태를 초기화한다.
- 승인 단계 중복 제출 방지, storage 저장 실패 때 승인 success 미표시.
- 동의 없음/철회는 별도 count; UI/JSON에서 마스킹된 실제 연락처가 없다.
- role switch는 simulation. 실제 법적 발송 승인권한/사용자 인증으로 안내하지 않는다.
- label/폼 오류/focus, 키보드, 360px 반응형, status 텍스트+아이콘, reduced motion.
- JSON export `sonsecha-auto-marketing-demo-YYYY-MM-DD.json`; 초기화 전 확인.

## 7. 인수 기준

- [ ] 카탈로그 카드로 구현 명세 이동.
- [ ] 데모/미발송/가상 날씨·고객 안내가 보인다.
- [ ] 최신/오래됨/오류 forecast, 영업상태, time window 결과가 seed와 규칙에 맞는다.
- [ ] 방문 30일 및 branch 필터, 채널별 동의/철회/unknown 억제 계산.
- [ ] 후보 수/이유별 제외 수는 합성 집계로만 표시, 연락처/ID 명단 노출 없음.
- [ ] 본문 입력 후 필수 검토 없이는 review 요청 불가.
- [ ] approval은 승인 기록만 남기고 예약/전송/외부 요청이 없다.
- [ ] snapshot 변경이 approval 무효화, clone creates separate draft.
- [ ] `npm run build` 성공 및 `dist/automated-marketing-app.html` 생성.
- [ ] 소스 검색상 외부 날씨 API, messaging provider, background scheduler, actual contact schema가 없다.

## 8. 실사용 자동화 전 입력

기상청/에어코리아 API별 상업 이용/재배포/호출량/기상 격자·예보 지연·보정 운영, 지점 좌표/격자 데이터 소유·접근, 실제 CRM의 목적·동의 채널·철회 최신성, 광고성 메시지 분류/표시/발신자/수신거부/야간 정책, 위탁자/전송자 인증·계약, channel 템플릿 심사, 개인정보 보유/삭제, 캠페인 예산/쿠폰 비용 분담, 사람 승인/kill switch, 메시지 중복·재시도 멱등성, 로그/대사/장애 대응을 확정해야 한다. 동의/법률 기준은 배포 시점에 최신 현행 자료로 재검토한다.

## 9. 근거와 한계

- [기상청 단기예보 OpenAPI](https://www.data.go.kr/data/15058629/openapi.do): REST/예보 데이터와 갱신 주기 등 실제 연동 시 제공 사양/공공데이터 라이선스 확인 참고. 특정 상품 조건을 임의 가정하지 않는다.
- [정보통신망법 제50조](https://www.law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1030434429): 광고성 정보 전송의 사전동의/수신거부 조건을 제품 전송 전 검토한다.
- [KISA 불법스팸 방지 안내서 제7차 개정본(2026-03-04)](https://www.kisa.or.kr/401/form?lang_type=KO&page=&postSeq=3608): 앱푸시 거부 절차, 모호한 동의 표현, 쿠폰/마일리지 발급·소멸 안내도 명시적 사전동의가 필요할 수 있음을 안내. 실제 내용은 법률/채널별 검토.
- [개인정보 보호법 제15·16조·제37조의2](https://law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1034516315): 자동화 결정 해당 여부는 실제로 중대한 결정을 완전히 자동화하는지 등 제품 사실관계에 따라 판단해야 한다.

이 자료는 상업용 API 사용 허가, 특정 캠페인의 법적 분류, 실제 전송 적법성이나 효과를 증명하지 않는다. 확인일: 2026-11-09.

# 세차장 CRM 구현 명세 v1.0

> 조사 초안: [01-carwash-crm.md](./01-carwash-crm.md)  
> MVP: 프로필·동의·방문 세그먼트·캠페인 미리보기를 확인하는 **합성 데이터 데모**  
> 실제 고객 개인정보 수집, 광고 발송, 법적 동의 증명은 제공하지 않는다.

## 0. 고정 개인정보·발송 결정

- 진입 `carwash-crm-app.html`; 코드 `src/carwash-crm.js`, `src/carwash-crm.css`; 기존 Vite/Vanilla JS/CSS 사용.
- 상시 고지 `CRM 데모 · 가상 고객 · 메시지 미발송`.
- 실제 이름/전화/email/차량번호/거래 키/정밀 위치는 seed와 입력에 사용하지 않는다. 가상 고객 ID와 마스킹된 DEMO label만 제공.
- 동의 UI는 실제 개인정보/광고 동의를 받는 양식이 아니라 동의 상태 설계 미리보기다. 상태는 전부 합성 fixture다.
- 캠페인 기능은 초안·세그먼트 크기·가상 대상 자격 검토·내용 미리보기까지만. 실제 SMS/email/push/Kakao 전송·예약·export 대상 연락처 생성은 절대 하지 않는다.
- 서비스 처리 알림 동의와 광고성 정보 수신 동의를 다른 `purpose`로 저장하고 UI에서 분리한다.
- 실제 계정, 지점 간 권한 보안, POS/PG/API, 외부 AI/메시지 업체, 결제/매출은 연결하지 않는다.
- 보유기간을 법적 기준처럼 하드코딩하지 않는다. 삭제는 이 데모 안에서 가상 프로필만 삭제한다.

## 1. 사용자 흐름

### 매장 CRM 데모

1. 가상 고객 목록에서 최근 방문/서비스 유형/채널별 데모 동의 상태를 확인한다.
2. 검색/방문기간/광고 수신 동의 필터를 이용한다. 실제 연락처 검색은 없다.
3. 가상 고객 상세에서 동의 변경 이력과 방문 이력을 본다.
4. 동의 상태 토글이 아니라 `광고 동의 미리보기`에서 허구의 동의/철회 이벤트를 만들고 출처를 `demo_simulation`으로 기록한다.
5. 재방문 세그먼트를 정의하고 대상 프로필 수, 제외된 인원/이유를 확인한다.
6. 캠페인 초안을 만들고 광고 문구/발신 매장/쉬운 수신거부 예시가 있는지 점검한다.
7. `전송 없음 · 초안 저장`만 가능하다.

## 2. 화면 상세

### 대시보드

제목 `세차장 CRM`; 데모 배지; 카탈로그 돌아가기. KPI: 가상 프로필 수, 최근 30일 가상 방문, 광고 동의 있음(테스트 fixture), 최근 철회(테스트 fixture). `실제 고객이나 캠페인 지표가 아닙니다.`를 KPI 가까이에 표시.

### 고객 목록/상세

목록 필드: 가상 프로필 ID, 고객 별칭, 지점 별칭, 최근 방문일, 누적 방문, 광고채널 동의 배지(채널별), 서비스 메시지 동의 별도 배지.

검색은 별칭과 데모 ID만 대상으로 하고 대소문자 구분 없는 부분 일치. 필터: 지점, 최근 방문(`30일/31~90일/91일 이상/미방문`), 광고동의(`채널 무관 동의/전체철회/상태혼합/미확인`). 필터 조합 가능.

상세 섹션: 프로필 최소 정보, 방문 이력 최대 10개, 마케팅 수신 동의 이력(목적/채널/상태/가상 문구 버전/이벤트 시각/수집 주체 `demo actor`), 철회 이력. 카드 필수 고지 `실제 동의 증거/연락 수단이 아닙니다.`

### 방문기록

seed 가상 방문 0~5건의 날짜, 서비스명, 거래 금액 구간만 표시. 거래 원본/카드번호/POS ID/차량번호 없다. 실제 생성/PG 연동 제외.

### 세그먼트 빌더

- 방문 조건: 마지막 방문이 30/60/90일보다 오래됨 또는 최근 30일 방문 1회 이상.
- 지점 선택 1개/전체 데모 매장.
- 추가 필수 억제 필터: 채널별 광고 동의 상태 확인, 철회 이력 제외, 삭제 프로필 제외.
- 사용자는 채널 하나를 선택해 eligibility preview를 계산한다. 여러 채널 통합 전송은 없다.
- 결과는 `대상 가상 프로필 N`, `동의 없음 N`, `철회 N`, `삭제됨 N` 수만 표시한다. 연락처/대상 명단 CSV 및 raw profile export를 제공하지 않는다.
- consent source missing/unknown/invalid이면 동의 없음으로 제외한다.

### 캠페인 초안

필드: 캠페인명 3~80자, 목적(`재방문 안내 데모`로 고정), 채널(`SMS 데모`, `이메일 데모`, `앱 푸시 데모`), 대상 세그먼트, 발신점 표시명, 문구(10~500자), 수신거부 안내 예시(필수 5~100자).

미리보기는 선택한 가상 채널 형식과 광고 표시 여부를 표시하고, 대상 수 산정 시점/동의 상태 버전을 함께 보여준다. `저장` 시 상태는 `draft`; CTA는 `전송하지 않음`으로 한다. 발송버튼/예약시간/업체 라우팅/주소록 파일이 존재하면 안 된다. 캠페인 본문이 변경되면 이전 미리보기 대상 계산을 만료시키고 재계산을 요구한다.

### 프로필 삭제/초기화

가상 프로필 단일 삭제는 확인 대화상자와 `삭제됨` tombstone을 만들고 세그먼트에서 제외한다. 감사 로그에는 데모 ID/삭제 시각만 남기고 방문 원문은 삭제한다. 전체 데모 초기화는 seed 복원. JSON export는 전부 가상임을 파일 메타데이터에도 넣고 `sonsecha-crm-demo-YYYY-MM-DD.json`으로 저장.

## 3. 동의/세그먼트 계산 규칙

동의 상태 단위는 `profileId + purpose + channel + noticeVersion`; 목적은 `service_notice` 또는 `marketing`. v1 캠페인의 eligible 계산에는 `purpose=marketing`, `status=granted`, `withdrawnAt=null`, 정확히 선택한 channel, profile not deleted 조건을 모두 만족해야 한다.

- SMS 동의가 있어도 email/push 동의로 해석하지 않는다.
- service_notice 허용은 marketing 가능으로 해석하지 않는다.
- 수신 거부/철회 이벤트가 동의 이벤트보다 나중이면 철회 상태다.
- 동의 출처/문구 버전/시각 누락은 `unknown`, 캠페인 제외.
- 동의값 수동 toggle/기존 고객 자동 승격 없음.
- 세그먼트 count는 캠페인 저장 시점에서 다시 계산하고, draft에는 `eligibleProfileIds`를 저장하지 않고 집계 수만 기록한다.
- 캠페인 생성 시각/동의 상태 snapshot version을 저장하고, 전송 개념 자체는 없다.
- 법정 유효기간/야간 발송/거래 예외를 앱에서 자동 적용하지 않는다. 실제 법률 검토 전에는 법규 통과 배지 금지.

## 4. 가상 fixture와 데이터 계약

12명의 가상 프로필, 2개 데모 매장, 24개 가상 방문, 채널별 동의/철회 이벤트, 세그먼트 3개, draft 캠페인 2개로 구성한다. 모든 ID `CUS-DEMO-xxx`, 가상 별칭 `세차고객 A` 형식. 가상 날짜는 현재 서울 날짜에서 상대 계산한다. 실제 전화/이메일은 문자열 속성에 저장하지 않는다.

local key `sonsecha.crm.demo.v1`, `schemaVersion: 1`.

```ts
type Purpose = 'service_notice'|'marketing';
type Channel = 'sms'|'email'|'push';
type ConsentState = 'granted'|'withdrawn'|'denied'|'unknown';
interface DemoProfile { id: string; alias: string; branchId: string; deletedAt: string|null; createdAt: string; synthetic: true }
interface ConsentEvent { id: string; profileId: string; purpose: Purpose; channel: Channel; state: ConsentState; noticeVersion: string|null; capturedAt: string; actor: 'demo_actor'; source: 'demo_simulation' }
interface DemoVisit { id: string; profileId: string; branchId: string; visitedAt: string; serviceLabel: string; amountBand: 'under_10k'|'10k_20k'|'over_20k'|null; synthetic: true }
interface Segment { id: string; name: string; branchId: string|'all'; visitRule: 'inactive_30'|'inactive_60'|'inactive_90'|'visited_30'; channel: Channel; createdAt: string }
interface CampaignDraft { id: string; name: string; channel: Channel; segmentId: string; senderLabel: string; body: string; optOutExample: string; status: 'draft'; eligibleCount: number; excludedCounts: Record<string,number>; consentSnapshotVersion: number; createdAt: string; transmitted: false }
```

Adapter `demoCrmAdapter`: `listProfiles(filters)`, `getProfile(id)`, `listVisits(profileId)`, `simulateConsentEvent(input)`, `buildSegmentPreview(input)`, `saveCampaignDraft(input)`, `deleteDemoProfile(id)`, `resetDemo()`, `exportSnapshot()`. UI는 직접 storage 접근 금지. 실제 연락처 입력 필드를 schema에 추가하지 않는다.

## 5. 보안/오류/접근성

- 데이터는 합성값뿐이라도 모든 본문을 escape한다. 사용자 입력 URL/HTML은 허용하지 않는다.
- 동의 시뮬레이션은 확인을 받고 상태 이벤트를 append; 기존 이벤트 수정 금지.
- 저장 실패/손상/버전 불일치에 성공 문구 금지, 사용자가 데이터를 초기화할 선택을 제공한다.
- 지점 전환 시 지점 제한이 UI에서 즉시 적용되는지 수용 테스트한다. 이는 인증이 아니라 데모 필터임을 설명한다.
- 캠페인 상세/버튼 어디에도 `발송 완료/발송 예약/수신자 추출`이 없어야 한다.
- 동의 상태는 텍스트/아이콘으로 식별. 명확한 label, focus, 키보드 사용, 360px 모바일 레이아웃, reduced motion.
- 실제 고객 데이터를 붙여넣지 말라는 경고를 고객/캠페인 입력 주변에 표시.

## 6. 인수 기준

- [ ] 카탈로그 카드가 이 명세로 연결된다.
- [ ] 모든 목록/상세/캠페인 화면에서 DEMO/미발송/가상 개인정보 안내.
- [ ] 목적/채널/철회/출처/버전 기준의 eligible 계산과 제외 수가 명세대로 동작.
- [ ] 광고동의와 서비스 안내 동의가 분리되고 채널 간 동의 승계가 없다.
- [ ] 캠페인 draft 저장/미리보기만 가능하고 연락처 목록·CSV·실제 send 경로가 없다.
- [ ] 프로필 삭제 tombstone 후 세그먼트에서 제외, 초기화 후 seed 복원.
- [ ] 방문 세그먼트 경계 30/60/90일이 한국 날짜 기준으로 계산됨.
- [ ] 저장 오류/키보드/모바일/빈 상태가 동작.
- [ ] `npm run build` 성공 및 `dist/carwash-crm-app.html` 생성.
- [ ] 소스 검색상 외부 발송 API/실제 이름·전화·이메일 schema/PG 데이터 수집이 없음.

## 7. 실사용 전 확인 사항

처리 목적/법적 근거/수집항목/동의 문구 버전, 서비스 안내와 광고 구분, 매장/본사/위탁자 역할 및 tenant 권한, 거래기록 분리/연결키, 정보통신망법 광고 수신 동의와 시간대/발신자/수신거부, 휴면/파기 보유기간, 동의 철회 즉시 억제, 외부 메시지 업체의 처리/국외이전/재위탁, 접근 감사/유출 대응을 개인정보 책임자·법률 검토자가 확인해야 한다.

## 8. 근거와 한계

- [개인정보 보호법 제15조·제16조·제22조](https://www.law.go.kr/lsLinkCommonInfo.do?lsJoLnkSeq=1029334747) 및 [제21조](https://www.law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1029334901): 처리 목적/최소수집/동의·파기 설계 경로.
- [정보통신망법 제50조](https://www.law.go.kr/LSW/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1030434429), [KISA 불법스팸 방지 안내서](https://www.kisa.or.kr/401/form?lang_type=KO&page=&postSeq=3608): 실제 광고 발송 조건과 거부 절차는 채널/현행 가이드에 맞게 별도 검토.
- [개인정보보호위원회 휴면 고객/마케팅 안내](https://pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS074&mCode=C020010000&nttId=9573): 마케팅 동의/보유정책 검토 참고.

이 자료는 이 데모의 실제 고객 데이터 처리나 마케팅 발송 적법성을 승인하지 않는다. 자료 확인일: 2026-11-09.

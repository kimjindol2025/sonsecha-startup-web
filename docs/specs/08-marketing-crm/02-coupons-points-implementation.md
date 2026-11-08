# 쿠폰·포인트 구현 명세 v1.0

> 조사 초안: [02-coupons-points.md](./02-coupons-points.md)  
> MVP: 무료 프로모션 쿠폰/포인트의 UI와 원장 흐름을 보여주는 **합성 데이터 데모**  
> 유상 충전/현금성 잔액/실제 결제·환불/혜택 발급은 제외.

## 0. 결제·가치 관련 구현 경계

- 진입 `coupons-points-app.html`; 코드 `src/coupons-points.js`, `src/coupons-points.css`.
- 고정 경고 `쿠폰·포인트 데모 · 금전 가치 없음 · 실제 고객에게 발급되지 않음`.
- v1 포인트는 현금 구매/충전/양도/환급에 쓸 수 없는 `비현금 프로모션 포인트 데모`뿐이다. 무료 데모 ledger 숫자도 가상이며 세차 결제에 사용할 수 없다.
- 유상/무료 포인트 또는 유상/무상 잔액, 상품권·선불전자지급수단, 계좌/카드, 현금 환급, 회계/세금/가맹점 정산, 포인트 선물 기능을 만들지 않는다.
- 쿠폰과 포인트의 “사용”은 브라우저 합성 이벤트만 기록하며 실제 가격 차감·세차 서비스 이용/예약/거래를 발생시키지 않는다.
- 실제 CRM 연동, 외부 메시지/쿠폰 전송, 결제·POS·PG, 로그인/점포 보안은 없다.
- Vite/vanilla JS만 이용, 새 의존성 금지. 카탈로그 링크를 이 명세로 바꾼다.

## 1. 사용자 흐름

### 프로모션 관리자 데모

1. 무료 데모 포인트 캠페인/쿠폰 종류를 본다.
2. 쿠폰을 만들거나 포인트 지급 이벤트를 가상 프로필에 기록한다.
3. 사용조건/유효기간/대상 매장을 지정하고 미리보기한다.
4. `데모 발급`을 누르면 수신 고객에게 보내는 대신 localStorage에 `issued` 이벤트를 저장한다.
5. 쿠폰/포인트 데모 사용·만료·취소 상태와 원장 합계를 확인한다.

### 가맹점 사용 데모

1. 가상 고객/지점을 선택한다.
2. 유효 쿠폰과 무료 프로모션 포인트 잔액을 본다.
3. `사용 시뮬레이션`으로 쿠폰 1개 또는 포인트 일부를 가상 사용한다.
4. 포인트 사용은 잔액이 충분한 때에만 가능하며 원장에 음수 소비 레코드를 추가한다. 동시 사용/실제 거래는 없다.

## 2. 화면/필드

### 공통 헤더/현황

제목 `쿠폰·포인트`; 설명 `가상의 무료 프로모션 혜택 흐름을 확인하는 데모`; 카탈로그 복귀; 데모/금전 가치 없음 배지. KPI: 데모 활성 쿠폰 수, 발급 이벤트 수, 사용됨 수, 합성 포인트 합계. 실제 금액/매출로 나타내지 않는다. 포인트 숫자 뒤 `P(데모)` 표시.

### 쿠폰 목록/생성

쿠폰 유형은 `정액 할인 데모`(예: 2,000원 표시) 또는 `퍼센트 할인 데모`(예: 10%)이나 할인액은 거래에 적용되지 않고 화면 예시임을 반복한다.

필수 입력: 이름 3~60자, 할인 유형, 수치(정액 1~1,000,000 가상 원 또는 퍼센트 1~100 정수), 지점 1개 이상, 시작/종료 날짜(서울 날짜, 종료 ≥ 시작), 고객별 발급 가능 수 1~5, 상태(`draft/active`). 선택 설명 최대 250자. “무료 데모 혜택 · 실제 가격과 무관” 문구 자동 렌더.

- 쿠폰 한 개는 한 프로필에 한 번만 `redeemed` 될 수 있다.
- `draft → active → ended` 전이. active 전환 전 요약 확인/취소가 있어야 한다.
- 발급 이벤트는 초기에 선택한 가상 고객 하나 또는 `데모 고객 전체`를 선택할 수 있다. 실제 발송은 하지 않는다.
- 프로필/지점별 수령 수가 limit 이상이면 발급하지 않는다. 대상 가상 프로필/지점이 없으면 발급 버튼 비활성.
- 사용 simulation은 시작/종료 날짜, branch scope, status를 재검증한다. 실패 시 구체적인 데모 사유를 보인다.

### 프로모션 포인트 원장

포인트 지급 필드: 고객, 포인트(1~100,000 정수), 만료일(현재 서울 날짜 이후 1~365일), 사유 3~100자, 관리자 이름 2~40자. 발급 전 `현금 충전이 아닌 데모 숫자` 확인을 요구.

- redeem simulation: 현재 유효 포인트 <= ledger 잔액, 1~잔액 정수, 사유 필수. 현금 환산/결제 차감이 아니라 무료 프로모션 사용 데모다.
- 모든 지급/사용/만료/되돌림은 append-only ledger로 기록. 기존 ledger를 수정/삭제하지 않는다.
- 수동으로 잔액을 덮어쓰는 입력창 금지. 취소가 필요하면 새 `reversal` 레코드와 사유/관리자 이름을 만든다.
- 포인트는 양도·현금 환급·가맹점 정산·타 쿠폰 전환이 없다.

### 프로필 혜택 화면

고객 ID는 `CUS-DEMO-001` 형태. 이름/연락처 없음. 지점별 쿠폰/포인트 분리 여부는 구현 상태가 아닌 단일 데모 branch scope로 표시. 쿠폰 이벤트/포인트 원장/현재 유효 잔액을 탭으로 보여준다.

## 3. 고정 seed 및 계산 규칙

가상 고객 8명, 데모 매장 2곳, 쿠폰 정의 3개(`draft`, `active`, `ended` 각각 1), 발급 이벤트 10개, 포인트 ledger 이벤트 16개를 seed한다. 포인트 seed 종류: `grant` 10, `redeem` 4, `expire` 1, `reversal` 1. 각 고객 수치는 ledger 합계로만 계산한다.

- 현재 잔액 = 해당 프로필·매장 ledger에서 `grant` 더하고 `redeem/expire` 차감 후 reversal 원장 부호를 반대로 적용한 유효(만료 전) 포인트의 합. grant reversal은 감액, redeem/expire reversal은 복원이다. 한 원장 항목은 한 번만 되돌릴 수 있고 reversal은 다른 reversal을 대상으로 할 수 없다. 잔액 < 0은 데이터 오류로 표시, 사용할 수 없다.
- 거래/환불 연계 없음. 쿠폰 상태: `draft`, `active`, `ended`; 발급 상태: `issued`, `redeemed`, `expired`, `revoked`.
- 만료는 날짜를 기준으로 조회 시 계산하며 원장 `expire` 이벤트가 없으면 list가 임의로 영구 삭제하지 않는다. 데모 버튼 `만료 시뮬레이션` 실행 때만 1건의 expire event를 append한다.
- 쿠폰 `active`여도 발급 이벤트의 valid until 지남, 지점 불일치, 사용완료이면 사용할 수 없다.
- 재시도/중복 클릭은 같은 simulation operation id로 중복 ledger를 방지한다.
- 계산은 정수 단위만. 소수 포인트는 거부.

## 4. 데이터 계약

localStorage key `sonsecha.coupons-points.demo.v1`, envelope `schemaVersion: 1`.

```ts
type CouponStatus = 'draft'|'active'|'ended';
type IssueStatus = 'issued'|'redeemed'|'expired'|'revoked';
interface DemoCoupon { id: string; name: string; discountType: 'fixed_demo'|'percent_demo'; value: number; branchIds: string[]; startsOn: string; endsOn: string; perProfileLimit: number; status: CouponStatus; synthetic: true }
interface CouponIssue { id: string; couponId: string; profileId: string; branchId: string; issuedAt: string; expiresOn: string; status: IssueStatus; redeemedAt: string|null; operationId: string }
interface PointEntry { id: string; profileId: string; branchId: string; kind: 'grant'|'redeem'|'expire'|'reversal'; points: number; occurredAt: string; expiresOn: string|null; reason: string; actor: string; reversesEntryId: string|null; operationId: string; synthetic: true }
```

`demoBenefitsAdapter`: `listCoupons(filters)`, `createCoupon(input)`, `activateCoupon(id)`, `issueDemoCoupon(input)`, `simulateCouponUse(input)`, `grantDemoPoints(input)`, `simulatePointUse(input)`, `simulateExpiry(input)`, `reversePointEntry(input)`, `getProfileBenefits(profileId,branchId)`, `resetDemo()`, `exportSnapshot()`. Promise API; storage 접근 이 adapter에만 둔다.

## 5. 오류·보안·접근성

- 사용자 텍스트는 escape. 수치/날짜/정수는 명시 검증한다. 잘못된 기간, 퍼센트 범위, 범위 초과 포인트, 중복 redemption, 부족잔액을 저장하지 않는다.
- `localStorage` 실패 때 사용/발급/지급 success 처리 금지. 원장 commit을 atomic snapshot 한 번으로 저장한다.
- reset 전 확인. JSON export `sonsecha-coupon-points-demo-YYYY-MM-DD.json`.
- 쿠폰/포인트 규칙과 잔액을 숫자만으로 보이지 않고 이력/계산 설명도 제공한다.
- 폼 label, inline validation, 키보드 focus, 모달 Escape, 360px 모바일, 텍스트 상태/아이콘, reduced motion.
- 현금, 충전, 환급, 잔액 이체, 결제, 실제 쿠폰 메시지 전송 UI를 만들지 않는다.

## 6. 인수 기준

- [ ] 카탈로그 링크/앱 페이지 이동.
- [ ] 화면에 데모·금전 가치 없음·실제 서비스 사용 불가가 계속 보인다.
- [ ] 고정 seed별 쿠폰 상태와 포인트 잔액이 정확하다.
- [ ] 쿠폰 기간/지점/한도 검증 및 중복 사용 방지가 동작한다.
- [ ] 포인트 사용은 append-only ledger 및 잔액 검증, 취소는 reversal로만 동작한다.
- [ ] 실제 결제액/매출/고객 연락처/계정 발송이 생성되지 않는다.
- [ ] 데이터 재로드 후 보존, reset/export, 저장 오류 처리가 동작한다.
- [ ] `npm run build` 성공 및 `dist/coupons-points-app.html` 생성.
- [ ] 코드상 유상 충전/환급/양도/정산/결제 API가 없다.

## 7. 실제 유상 혜택 전에 필요한 결정

각 상품의 법적 성격과 발행자·이용 범위·양도성·환급/유효기간, 프로모션 포인트와 선불 가치 분류, 전자금융업 등록/보호/정산 적용, 표시광고/전자상거래/약관, 가맹본사-점포 비용분담, 부가세/회계 처리, 환불/취소/부정 사용/분실, 서버 원장·감사·정산·중복방지, POS/PG 연동, 개인정보와 메시지 발송 동의 조건을 금융/법률/세무 책임자가 검토해야 한다. 데모 명세는 현행 분류를 대신하지 않는다.

## 8. 근거와 한계

- [전자금융거래법 제2조 및 2026-10-02 시행본](https://www.law.go.kr/LSW/lsInfoP.do?ancYnChk=0&chrClsCd=010202&efYd=20261002&lsiSeq=290247): 선불전자지급수단 정의/발행·관리 규율은 상품 구조와 실질에 따라 확인해야 한다. 이 데모는 상품권/선불수단에 해당한다고 단정하지 않고, 현금성 기능을 구현 범위에서 제외한다.
- [전자금융거래법 제18조 양도 제한/예외](https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0018&lsiSeq=280277&urlMode=lsScJoRltInfoR): 양도/이용조건 설계는 실제 상품 검토 필요.
- [국가법령정보센터 전자금융거래법 시행령](https://www.law.go.kr/lsInfoP.do?lsId=010366): 발행/관리 조건은 최신 시행령과 제품 구조를 확인한다.

이 자료는 특정 무상 포인트/쿠폰의 법률상 분류 또는 실제 상품 출시 적합성을 판단하지 않는다. 자료 확인일: 2026-11-09.

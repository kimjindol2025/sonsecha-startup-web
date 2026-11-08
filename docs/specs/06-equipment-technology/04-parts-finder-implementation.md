# 세차장 부품 찾기 구현 명세 v1.0

> 조사 초안: [04-parts-finder.md](./04-parts-finder.md)  
> MVP: 승인되지 않은 실제 카탈로그를 흉내내지 않는 **가상 부품 검색/문의 데모**

## 0. 구현 경계

- 기존 Vite/JavaScript/CSS를 사용한다. 페이지 `parts-finder-app.html`, 코드 `src/parts-finder.js`, `src/parts-finder.css`.
- 상시 표시: `데모 카탈로그 · 실제 제조사 호환/재고/가격 미확인`.
- 데이터는 전부 가상 `DEMO` 모델/품번이다. 실제 제조사 로고, 카탈로그 도면/사진, 모델과 유사한 상품번호를 넣지 않는다.
- 실제 제조사 검색, 이미지 인식/OCR/AI, 호환품 자동 추정, 재고/가격/배송, 구매/결제, 딜러 문의 전송은 구현하지 않는다.
- 문의는 브라우저 데모 저장소 안에서만 기록한다. 실제 전화/이메일을 보내지 않는다.
- 고압·전기·가스·회전/압력 안전 관련 부품은 대체 추천 기능을 만들지 않는다.

카탈로그의 `부품 찾기` 카드에서 이 상세 명세를 열도록 한다. 기존 장비관리 페이지는 변경하지 않는다.

## 1. 사용자와 사용 흐름

점주/기사가 가상의 장비 모델 또는 부품번호를 찾아 근거 상태를 확인하고, 정보가 부족하면 가상 문의 초안을 저장한다.

1. 검색창에 품번/모델/부품명을 입력하거나 제조사·장비군을 선택한다.
2. 결과의 정확도 상태(`정확 일치`, `이름 일치`, `자료 미확인`)와 근거 배지를 확인한다.
3. 부품 상세에서 데모 모델, 적용 관계의 상태, 증거 문서 메타데이터, 안전/보증 주의를 읽는다.
4. 자료가 맞지 않거나 없으면 모델/일련번호(가상 입력), 문의 내용을 넣어 문의 초안을 저장한다.
5. 저장된 초안은 `데모 문의함`에서 확인/삭제한다. 실제 업체에 전달됐다고 표현하지 않는다.

## 2. 화면 상세

### 공통 헤더와 검색

제목 `세차장 부품 찾기`; 설명 `가상 부품 카탈로그에서 모델과 근거 정보를 확인합니다.`; 고정 데모 배지; 카탈로그 돌아가기 `./carwash-app-catalog.html`.

검색 입력 2~80자, 디바운스 없이 submit 또는 Enter 시 실행. 앞뒤 공백 제거 후 대문자 변환, 연속 내부 공백은 1개로 바꾼다. 하이픈·슬래시·점은 삭제하지 않는다(정확한 품번 문자가 중요할 수 있음). 검색 필드: canonical part number, 등록된 alias, part name, demo model code. 검색 결과 순서는 정확한 품번→정확한 모델 코드→정확한 별칭→이름 부분일치; 같은 단계 내에는 품번 오름차순.

제조사/장비군 필터는 `전체` 기본. 검색어/필터 모두 결과에 적용한다. 결과 없음은 `이 조건에 맞는 데모 항목이 없습니다. 정확히 확인된 호환 부품이 없다는 뜻이지, 실제로 부품이 없다는 뜻은 아닙니다.`와 필터 초기화 버튼을 제공한다.

### 검색 결과

각 행/카드: 가상 부품명, DEMO 품번, 장비 제조사/모델, 카탈로그 구분, 근거상태, 수량/가격 대신 `재고·가격 연동 안 됨`. 호환 관계 근거가 `데모 관계`면 결과에 항상 해당 배지를 크게 표시한다.

### 상세 패널

- 부품 설명, DEMO 품번, 데모 장비군/제조사/모델/모델 suffix, 도면 위치 번호(가상 데이터에만 존재).
- 관계 상태: `데모 관계 · 실제 호환 승인 아님`, `근거 없음`, `검토 필요`. v1에서는 `OEM 정품`, `호환 승인`, `안전 부품`, `제조사 보증 유지` 표현 금지.
- 근거 자료는 제목/문서 버전/페이지/제공자 유형/마지막 확인일/URL로 표시한다. seed는 실제 URL 대신 `가상 문서` 상태로 하고 클릭 가능한 출처 링크를 생성하지 않는다.
- “유사 모델이므로 호환”이라는 자동 결론을 만들지 않는다. 고압/전기 안전에 영향을 주는 데모 부품도 구매 추천 CTA를 붙이지 않는다.
- `문의 초안 만들기`는 로컬 데모 입력 폼을 연다.

### 데모 문의함

필수: 장비 DEMO 모델 코드 또는 `모델 미상`, 문의자 표시명 2~40자, 문의 내용 10~1000자. 선택: 장비 일련번호(최대 40자), 찾는 부품번호(최대 80자), 연결 부품 ID. 실제 개인정보·실주소 입력 경고를 보인다. 저장 결과에는 `저장됨 · 업체에 전송되지 않음`을 고정 표시한다. 로컬 초안의 생성시각, 상태(`초안` 고정), 삭제 버튼을 보이며 전송/완료 상태를 제공하지 않는다.

## 3. Seed 및 검색 동작

초기 데이터: 가상 제조사 3개, DEMO 장비 모델 6개, DEMO 부품 12개, 관계 문서 메타데이터 8개. 정품/호환 승인된 항목은 0개. 가상 관계 fixture 4개는 모두 `sample_only`이고 UI에 데모 관계로 표기한다. 결과 목록에는 항상 전체 12개에서 필터 가능한 데이터가 들어간다.

- Canonical code `DEMO-...`와 alias의 정확 정규화 일치만 exact 단계로 취급한다.
- 부분 품번 일치는 별도 `이름/설명 부분일치` 구역으로 낮춰 표시하며 모델 적용 결과를 만들지 않는다.
- 동일한 코드가 여러 부품에 있다면 모든 후보를 표시하고 임의로 하나를 먼저 “정답” 처리하지 않는다.
- 모델 suffix, 생산연도, 일련번호 범위가 없거나 일치하지 않으면 `모델 적용 근거 없음`으로 처리한다.
- 검색 결과는 부품ID 기준으로 중복 제거한다. 문의 초안에는 검색 시점의 부품/모델 표기 스냅샷을 기록한다.

## 4. 데이터 계약과 저장

키 `sonsecha.parts-finder.demo.v1`, `schemaVersion: 1`.

```ts
type EvidenceStatus = 'sample_only' | 'missing' | 'needs_review';
interface DemoEquipmentModel {
  id: string; manufacturerId: string; family: string; modelCode: string;
  suffix: string; yearLabel: string; isDemo: true;
}
interface DemoPart {
  id: string; partNumber: string; aliases: string[]; name: string;
  category: string; description: string; safetySensitive: boolean; isDemo: true;
}
interface CompatibilityEvidence {
  id: string; partId: string; modelId: string; status: EvidenceStatus;
  sourceTitle: string; sourceVersion: string; sourcePage: string;
  providerType: 'synthetic_fixture'; checkedAt: string; note: string;
}
interface InquiryDraft {
  id: string; modelCode: string; serialNumber: string; partNumber: string;
  partSnapshot: string; requesterName: string; message: string;
  createdAt: string; status: 'draft'; transmission: 'not_sent';
}
```

화면 코드는 localStorage를 직접 사용하지 않고 `demoPartsAdapter`에 요청한다: `searchParts(input)`, `getPartDetail(id)`, `listDemoModels(filters)`, `createInquiryDraft(input)`, `listInquiryDrafts()`, `deleteInquiryDraft(id)`, `resetDemo()`, `exportSnapshot()`. 모든 함수는 Promise 기반이어야 한다. 이 계약은 외부 공급자 API가 아니라 프런트엔드 내부 경계다.

로컬 데이터 손상/미지원 버전은 기본 seed 복구 안내를 보인다. 저장 오류 때 문의 저장 성공을 표시하지 않는다. 삭제 전 확인하고, 복구 가능한 Undo는 제공하지 않는다.

## 5. 보안·접근성·오류

- 사용자 입력/부품 설명은 HTML escape하고 URL은 seed에서 클릭 가능하지 않게 한다.
- 문의 필드에 개인정보/실제 주소/계정/설비 접속정보를 입력하지 말라고 안내한다. 그런 정보를 요구하는 필드는 추가하지 않는다.
- 검색 비어있음, 입력 짧음/김, 결과 없음, 상세 없음, localStorage 실패를 한국어로 처리한다.
- 모든 폼은 label 연결, 입력 오류 표시, 키보드 포커스, Escape 닫기, 제출 버튼 이름을 제공한다.
- 색상만으로 근거 상태를 표시하지 않는다. 텍스트 badge와 아이콘을 병행한다.
- 모바일 폭 360px에서 표는 카드로 바뀌고 가로 스크롤이 없어야 한다.
- 데모 초기화와 JSON export 제공. JSON 파일명 `sonsecha-parts-finder-demo-YYYY-MM-DD.json`.

## 6. 인수 기준

- [ ] 카탈로그 `부품 찾기` 카드가 구현 명세에 연결된다.
- [ ] 페이지에서 실제 제조사 자료/실부품/승인 호환이 아니라는 사실이 분명하다.
- [ ] 검색 정규화와 정렬 우선순위가 위 규칙과 일치한다.
- [ ] 유사/부분 일치 항목을 확인된 모델 호환 결과로 표시하지 않는다.
- [ ] 상세는 근거 누락/재검토/가상 근거를 분명히 표시한다.
- [ ] 문의 초안 생성/목록/삭제/새로고침 후 보존이 동작하고 외부 전송 문구가 없다.
- [ ] 안전 민감 품목에는 구매/대체 추천 CTA가 없다.
- [ ] JSON 내보내기/초기화와 오류/모바일/키보드 상태가 동작한다.
- [ ] `npm run build` 성공, `dist/parts-finder-app.html` 생성.
- [ ] 실제 공급자 API, OCR, 외부 전송, 주문/결제 코드가 추가되지 않는다.

## 7. 실카탈로그 단계 입력

제조사/딜러의 데이터 이용 허가와 파일/API 스키마, 모델 suffix/일련번호 적용 범위, 대체 부품 승인 문서, 발행자와 개정일, 단종 대체 관계, 상표/도면/사진 사용허가, 재고/가격 갱신 주체, 문의 SLA, 반품/보증/안전 책임자를 받아야 한다. 국내 법률 검토와 근거 검수 운영이 확정되기 전에는 “정품/호환/승인” 상태를 노출하지 않는다.

## 8. 근거와 한계

- [Kärcher spare parts](https://www.kaercher.com/us/en/services/spare-parts) 및 [Kärcher nameplate lookup](https://www.kaercher.com/dk/services/home-garden/h-g-reservedele.html): 모델/명판 중심으로 공식 부품을 식별하는 방식 참고.
- [Cat Pumps identification guide](https://www.catpumps.com/sites/default/files/2019-12/99REF004C%20REF%20Pump%20Identification%20Lo.pdf), [official FAQ](https://www.catpumps.com/index.php/faq): 모델 식별 시 각인·치수 등 자료를 공식 기술지원에 요청하는 사례 참고.
- [Kaeser part service request](https://us.kaeser.com/services/customer-service/consumable-and-spare-parts/part-service-request.aspx): 장비 번호와 부품번호 기반 공식 문의 흐름 참고.

이 자료는 세차장 국내 보급 모델/카탈로그 접근권, 특정 호환성, 상표 표기 허용 여부를 입증하지 않는다. 자료 확인일: 2026-11-09.

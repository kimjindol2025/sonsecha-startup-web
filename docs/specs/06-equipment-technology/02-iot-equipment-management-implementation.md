# 세차장 IoT 장비관리 구현 명세 v1.0

> 조사 초안: [02-iot-equipment-management.md](./02-iot-equipment-management.md)  
> 구현 범위: 센서/장비 관리 흐름을 재현하는 **합성 데이터 기반 브라우저 MVP**  
> 실제 센서·PLC·게이트웨이 통신과 자동제어는 이 명세의 범위가 아니다.

## 0. 구현 기본 결정

| 결정 | v1 |
|---|---|
| 실행환경 | Vite 멀티페이지 웹앱, GitHub Pages 및 로컬 브라우저 |
| 진입점 | `iot-equipment-management-app.html` |
| 코드 | `src/iot-equipment-management.js`, `src/iot-equipment-management.css`, 저장소 기존 JavaScript/CSS만 사용 |
| 데이터 | 화면에 `데모 데이터 · 실제 센서 미연결` 상시 표시. 가상 매장/센서만 사용 |
| 저장 | `localStorage`에 데모 설정/점검/경보 조치 저장. 사용자·기기 간 공유 금지 |
| 기능 제외 | 실제 센서 연결, Modbus/OPC UA/MQTT, 문자·푸시 발송, 로그인/권한, 릴레이·펌프·히터 제어 |
| 안전 표시 | 예시 임계치는 데모 값이다. 안전 기준이나 법정 점검 기준이 아니며 센서 판단이 현장 확인을 대체하지 않는다 |

새 프레임워크와 패키지를 추가하지 않는다. 기존 장비 점검 이력 앱 `equipment-app.html`/`src/operations-apps.js`는 변경하지 않는다. 카탈로그의 IoT 장비관리 카드에서 이 문서와 새 앱 페이지에 도달할 수 있게 한다.

## 1. 사용자와 완료 흐름

매장 관리자가 가상의 센서 구성을 보고, 한 센서의 데모 경보를 확인하고, 점검 기록을 남기는 흐름을 제공한다.

1. 센서 현황에서 지점·장비·온라인/주의/오프라인 수를 확인한다.
2. 센서 목록을 지점, 설비 종류, 통신 상태, 품질 상태로 필터링한다.
3. 센서 상세에서 측정값과 단위, 측정/수신 시각, 연결 품질, 최근 20개 측정 기록을 본다.
4. 확인이 필요한 센서 경보를 확인 처리한다.
5. 교정/배터리/점검 이력을 기록하고 센서·장비 상세 타임라인에서 확인한다.
6. 데모 상태를 초기화하거나 JSON으로 내보낸다.

## 2. 화면 및 동작

### 2.1 공통 헤더

제목 `IoT 장비관리`; 설명 `센서 측정과 점검 이력을 관리하는 데모입니다.`; 고정 배지 `데모 데이터 · 실제 센서 미연결`; 카탈로그 돌아가기 `./carwash-app-catalog.html`.

### 2.2 현황

- KPI 카드: 등록 센서 수, 정상, 주의, 통신 끊김.
- 센서 테이블: 지점, 설비/센서명, 측정값+단위, 품질, 마지막 수신, 상태. 모바일은 카드로 표시.
- 필터: 지점(`전체` 기본), 설비(`전체`), 상태(`전체`), 품질(`전체`); 텍스트 검색은 지점/설비/센서명 부분 일치.
- 최근 경보 최대 5건. 경보 선택 시 해당 센서 상세로 이동한다.
- 상태 구분은 텍스트와 아이콘을 색상과 함께 표시한다. 수신이 없는 센서는 정상으로 세지 않는다.

### 2.3 센서 상세

장비 제조사/모델(가상), 장비 ID, 설치 위치, 센서 ID, 센서 종류, 현재값/단위, 데모 임계치, 품질, 측정시각, 수신시각, 배터리(해당 시), 최근 측정 20건과 점검 기록을 표시한다. 값이 `null`이면 `측정값 없음`; quality `bad/unknown`이면 값이 있어도 `확인 필요`로 표현한다. 게이지의 색상은 표시 편의일 뿐 안전 판정이나 적합/부적합 판정으로 사용하지 않는다.

### 2.4 데모 임계치 설정

- 센서 상세에서 `데모 경보 기준`을 열어 최소/최대 중 하나 또는 둘 다 입력한다.
- 임계치는 숫자이며 측정 단위와 같은 단위로 표시한다. 최소값이 최대값보다 크면 저장을 거부한다.
- 숫자값이 최소보다 작거나 최대보다 크면 `주의` 이벤트를 한 건 만든다. 경계값과 같은 값은 범위 내로 본다.
- 입력값은 센서별로 저장되며 변경자 이름, 변경시각, 이전/새 기준의 이력을 기록한다.
- 입력 폼과 결과에 `데모용 기준입니다. 실제 장비에 적용하지 마세요.`를 표시한다. 초기 seed 임계값은 아래 고정 데이터를 따른다.

### 2.5 경보·점검

- 경보 상태 `미확인 → 확인`; 확인은 해결이 아니다. 자동 해결하지 않는다.
- 확인자 이름은 필수 2~40자, 메모는 선택 최대 500자.
- 점검 기록 유형: `현장 확인`, `센서 교정`, `배터리 교체`, `센서 교체`, `통신 점검`, `기타`.
- 점검 필드: 유형(필수), 점검자(필수 2~40자), 점검 시각(기본 현재 한국 시간), 결과(필수 3~500자), 다음 점검일(선택), 사진은 v1 미지원.
- 점검 저장은 센서 상태를 자동 정상화하지 않는다. 새 측정이 없어 오프라인인 상태는 계속 오프라인이다.

### 2.6 재설정·내보내기

`데모 초기화`는 확인 대화상자 뒤 센서/기준/경보/점검 기록을 seed로 복원한다. `JSON 내보내기`는 현재 화면 데이터만 UTF-8 JSON으로 저장하고 이름은 `sonsecha-iot-monitor-demo-YYYY-MM-DD.json`으로 한다. 저장 실패 시 성공 알림을 띄우지 않고 브라우저 저장 실패 안내를 보인다.

## 3. 고정 데모 데이터와 규칙

모든 지명·제조사·모델은 가상이며 실사업장/특정 제품처럼 표시하지 않는다.

| ID | 설비/센서 | 값/단위 | 초기 데모 상태 | 예시 기준 |
|---|---|---|---|---|
| `sens-pump-current` | 세차 펌프 전류 | 8.4 A | 정상 | 최대 12 A |
| `sens-compressor-pressure` | 콤프레셔 압력 | 0.72 MPa | 주의 | 최소 0.75, 최대 0.9 MPa |
| `sens-boiler-temp` | 보일러 온도 | 42 °C | 정상 | 최소 10, 최대 70 °C |
| `sens-freeze-zone-temp` | 배관 구역 온도 | 3 °C | 주의 | 최소 5 °C |
| `sens-tank-level` | 재이용수 탱크 수위 | 68 % | 정상 | 최소 20, 최대 95 % |
| `sens-wastewater-level` | 집수조 수위 | 값 없음 | 통신 끊김 | 기준 미설정 |

이 수치들은 데모 화면과 경계값 계산을 위한 임의 fixture다. 어느 것도 실제 안전 한계/정상 운전 범위를 나타내지 않는다. 화면에 샘플 센서값 설명 문구를 제공한다.

### 상태 판단 순서

1. 측정값 없음 또는 품질 `bad/unknown`이면 `확인 필요`.
2. 마지막 수신시각부터 120초 초과면 `통신 끊김`. 초기 데모 fixture 상태는 이 계산 대신 seed된 상태를 보여 주며 데모 배지를 유지한다.
3. 값이 설정된 데모 최소/최대 밖이면 `주의`.
4. 나머지는 `정상`.

상태 우선순위는 `통신 끊김 > 확인 필요 > 주의 > 정상`. 통신 단절은 설비 고장과 별개 이벤트다. 실연동 시 120초는 시작 가정일 뿐 센서별 측정 주기 확인 전 운영 기준으로 쓰지 않는다.

## 4. 데이터 및 어댑터 계약

데모 저장 키: `sonsecha.iot-equipment.demo.v1`; envelope에 `schemaVersion: 1`을 둔다.

```ts
type SensorStatus = 'normal' | 'warning' | 'offline' | 'unknown';
type MeasurementQuality = 'good' | 'uncertain' | 'bad' | 'unknown';
interface Sensor {
  id: string; siteId: string; equipmentId: string; name: string;
  metricKey: 'current' | 'pressure' | 'temperature' | 'water_level';
  unit: 'A' | 'MPa' | '°C' | '%'; status: SensorStatus;
  lastValue: number | null; quality: MeasurementQuality;
  measuredAt: string | null; receivedAt: string | null; batteryPercent: number | null;
}
interface Threshold {
  sensorId: string; min: number | null; max: number | null;
  source: 'demo'; updatedAt: string; updatedBy: string;
}
interface Reading {
  id: string; sensorId: string; value: number | null; unit: string;
  measuredAt: string; receivedAt: string; quality: MeasurementQuality;
}
interface SensorAlert {
  id: string; sourceEventId: string; sensorId: string; severity: 'warning' | 'info';
  title: string; occurredAt: string; status: 'open' | 'acknowledged';
  acknowledgedAt: string | null; acknowledgedBy: string | null; note: string;
}
interface Inspection {
  id: string; sensorId: string; kind: string; inspector: string;
  inspectedAt: string; result: string; nextDueAt: string | null;
}
```

화면은 `demoIotAdapter`만 호출한다. API: `listSites()`, `listSensors(filters)`, `getSensorDetail(sensorId)`, `updateThreshold(input)`, `acknowledgeAlert(input)`, `createInspection(input)`, `resetDemo()`, `exportSnapshot()`. 모든 메서드는 Promise를 반환한다. 직접 외부 네트워크 요청을 하지 않으며 localStorage 쓰기를 이 어댑터 내부에 한정한다. 기준 변경 이력은 `thresholdHistory[]`로 append-only 저장한다.

시간은 ISO 8601 UTC 문자열로 저장하고 `Asia/Seoul` 기준으로 표시한다. `measuredAt`과 `receivedAt`은 반드시 분리한다. `measuredAt > receivedAt`, 단위 불일치, 파싱 불가 값은 `unknown` 품질로 처리한다. 같은 `sourceEventId` 경보는 중복 생성하지 않는다.

## 5. 보안·오류·접근성

- 페이지 어디에도 실제 장비 데이터, API 키, 계정, IP/포트, 인증서, 실주소를 넣지 않는다.
- PLC/센서 쓰기 명령, MQTT publish, 외부 연결 코드를 추가하지 않는다.
- 사용자 입력은 HTML escape한다. 숫자 폼은 `Number.isFinite`, min/max 순서를 확인한다.
- localStorage JSON 손상/지원하지 않는 버전은 데이터 손실 가능성을 설명하고 안전하게 seed 초기화한다.
- 저장 예외/QuotaExceededError 시 페이지는 유지하고 오류 메시지와 JSON 내보내기를 제공한다.
- modal/폼은 키보드 접근 가능해야 하며 label, 오류 연결, 포커스 이동/복귀, Escape 닫기를 지원한다.
- 360px 화면 폭에서 가로 페이지 스크롤이 없다. 상태는 색상 외 텍스트/아이콘으로 식별한다.
- reduced motion 선호를 존중한다. 사진 업로드와 센서 그래프 라이브 업데이트는 v1에 없다.

## 6. 완료 기준

- [ ] 카탈로그 IoT 카드에서 구현 명세와 앱 페이지 양쪽으로 이동 가능하다.
- [ ] 데모/실센서 미연결 고지가 항상 보인다.
- [ ] 초기 센서 6대 및 고정 상태/값이 표의 값과 일치하고, KPI 합계가 맞다.
- [ ] 지점·설비·상태·품질·검색 필터가 조합 동작하고 0건 빈 상태/초기화가 있다.
- [ ] 센서 상세에서 측정/수신시각, 단위, 품질을 분리해 표시한다.
- [ ] 기준 입력 유효성, 경계값 판정, 기준 변경 이력, 경보 중복 방지가 동작한다.
- [ ] 경보 확인과 점검 기록이 재로드 이후 남고, 확인/점검이 센서 상태를 임의 정상화하지 않는다.
- [ ] 데모 초기화와 JSON 다운로드가 지정된 동작을 한다.
- [ ] 오류·빈 상태·키보드/모바일 사용을 확인한다.
- [ ] npm 빌드에서 `dist/iot-equipment-management-app.html`이 생성된다.
- [ ] 코드상 실제 통신/센서 제어/외부 알림 기능이 추가되지 않는다.

## 7. 실연동 단계 진입 조건

센서 제조사/모델/펌웨어, 출력·통신 사양 및 라이선스, 센서별 데이터 사전·샘플 로그, 단위/측정 주기/오류 코드, 설치 위치와 방수·방진·전원 조건, 인증/보증 영향, 게이트웨이 네트워크·인증서 운영자, 임계치 근거와 대응 책임자가 확정된 뒤 별도 어댑터 명세를 작성한다. Modbus/OPC UA는 후보일 뿐 장비 지원을 의미하지 않는다. 무선 장비의 국내 적합성평가 및 전기 안전 적용은 정확한 제품·구성으로 책임자가 확인한다.

## 8. 근거

- [Modbus Organization specifications](https://www.modbus.org/modbus-specifications): Modbus 사양은 연동 후보 참고자료이며 세차 설비별 지원 확인은 별도다.
- [OPC Foundation OPC UA](https://opcfoundation.org/about/opc-technologies/opc-ua/): 표준의 기능이 실제 제품에 탑재됐다고 추정하지 않는다.
- [CISA remote access for ICS](https://www.cisa.gov/sites/default/files/recommended_practices/RP_Managing_Remote_Access_S508NC.pdf), [NIST SP 800-82 Rev. 3](https://csrc.nist.gov/pubs/sp/800/82/r3/final): OT 시스템의 연결은 보안/가용성/안전 요구를 고려하고 시스템별로 결정한다.
- [국립전파연구원 적합성평가 안내](https://www.rra.go.kr/ko/license/A_a_about.do): 제품의 무선 구성과 분류를 확정한 뒤 적용 절차를 검토한다.

자료는 기술 설계 참고이며 특정 세차장 센서와 법적 적합성, 실제 안전한계 또는 사고 예방 효과를 입증하지 않는다. 1차 자료 확인일: 2026-11-09.

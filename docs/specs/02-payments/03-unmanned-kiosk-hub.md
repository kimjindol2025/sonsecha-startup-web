# [기획서] 무인결제 통합관리 앱 (Unmanned Kiosk Hub App)

> **카테고리**: 02 매출·결제 (A급 · 현장 필수)  
> **앱 ID**: `app-pay-kiosk-hub`  
> **목적**: 무인 키오스크, 신용카드 결제 단말기, 입차 차단기, RF카드 발급기의 하드웨어 상태를 원격 모니터링하고 원격 결제 리셋 및 장애 대응

---

## 1. 서비스 개요 및 타깃
- **대상 사용자**: 세차장 점주, 원격 관제팀, 키오스크 제조/VAN사
- **핵심 가치**:
  - 심야 시간 점주가 매장에 상주하지 않아도 **스마트폰으로 키오스크 장애 원격 리셋**
  - 영수증 용지 부족, 카드 걸림(Jam), VAN사 통신 단절 즉시 푸시 알림
  - 고객 현장 결제 실패 시 **원격 세차 시작 신호(Remote Trigger) 송출**

---

## 2. 주요 기능 요구사항

| 기능 ID | 기능명 | 상세 내용 |
| :--- | :--- | :--- |
| `FEAT-KS-01` | **실시간 하드웨어 헬스체크** | 키오스크 PC, IC카드 리더기, 지폐인식기, 감열 프린터의 온/오프라인 통신 상태 감시 |
| `FEAT-KS-02` | **원격 긴급 리셋** | 카드 리더기 먹통 또는 결제 화면 프리징(멈춤) 시 소프트웨어/하드웨어 원격 재부팅 |
| `FEAT-KS-03` | **원격 세차 베이 개방/가동** | 고객 카드 승인 후 기계 미작동 민원 발생 시, 점주가 원격으로 해당 베이에 세차 시작 펄스 신호 전송 |
| `FEAT-KS-04` | **결제 오류 로그 분석** | VAN사 에러코드(IC칩 인식 불가, 통신 타임아웃, 한도 초과 등) 실시간 로깅 |

---

## 3. 데이터 구조 및 상태 스키마

```typescript
export interface KioskDeviceStatus {
  deviceId: string;             // "kiosk-bay-01"
  ipAddress: string;            // 내부 IP
  isOnline: boolean;            // 실시간 소켓 연결 상태
  lastHeartbeat: string;        // 최종 핑 시각
  
  components: {
    cardReaderStatus: 'ok' | 'jammed' | 'disconnected';
    printerPaperStatus: 'normal' | 'low' | 'out_of_paper';
    cashBillValidatorStatus: 'ok' | 'full' | 'jammed';
    displayTouchStatus: 'ok' | 'error';
    barrierGateStatus: 'closed' | 'open' | 'stuck';
  };
  
  currentError?: {
    errorCode: string;          // 예: "VAN_TIMEOUT_99"
    errorMessage: string;
    occurredAt: string;
  };
}
```

---

## 4. 원격 긴급 조치 시나리오
1. **고객 상황**: 키오스크에서 15,000원 결제 승인 완료되었으나 베이 문이 열리지 않고 세차기가 돌지 않음
2. **원격 대응**: 점주 스마트폰 앱에서 결제 승인 확인 → `[원격 세차 기동]` 버튼 클릭 → PLC 컨트롤러에 세차 개방 신호 전송 → 즉시 세차 개시 및 민원 해소

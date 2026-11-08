# [기획서] 폐수·환경 관리 앱 (Wastewater & Environmental Compliance App)

> **카테고리**: 01 운영·관리 (A급 · 현장 필수)  
> **앱 ID**: `app-ops-wastewater`  
> **관련 법령**: 물환경보전법 제38조의2  
> **목적**: 폐수처리시설 유입량, 정화 처리량, 전력량, 약품 투입량, 슬러지 위탁 처리를 기록하고 환경부 법정 서식(3년 보관)을 원클릭 출력

---

## 1. 서비스 개요 및 타깃
- **대상 사용자**: 세차장 사업자(환경기술인 지정 점주), 지자체 환경지도과 단속 공무원
- **핵심 가치**:
  - 지자체 불시 점검 시 과태료(300만원) 및 조업정지 위험 100% 방어
  - 수기 공책 작성 폐지 → 계량기 수치만 입력하면 표준 서식 자동 계산
  - 비정상 용수 급증 시 배관 누수 즉시 감지

---

## 2. 주요 기능 요구사항

| 기능 ID | 기능명 | 상세 내용 |
| :--- | :--- | :--- |
| `FEAT-WW-01` | **계량기 일일 지침 입력** | 상수도 적산수량계(㎥), 지하수 유량계, 방지시설 전력계(kWh) 지침 기록 |
| `FEAT-WW-02` | **폐수 및 슬러지 밸런스 연산** | 세차 차량수 및 용수 지침 기반 폐수 발생량(㎥), 처리량(㎥), 슬러지 보관량 자동 산출 |
| `FEAT-WW-03` | **환경부 표준 일지 A4 출력** | 「수질오염물질 배출시설 및 방지시설 운영기록부」 법정 서식 완벽 호환 인쇄 |
| `FEAT-WW-04` | **위탁 수거 증빙 아카이빙** | 슬러지 위탁 수거업체명, 차량번호, 올바로시스템(Allbaro) 인계번호 보관 |

---

## 3. 데이터 구조 및 계산 수식

```typescript
export interface WastewaterRecord {
  recordDate: string;           // YYYY-MM-DD
  waterMeterStartM3: number;    // 상수도 전일 지침
  waterMeterEndM3: number;      // 상수도 당일 지침
  dailyWaterUsageM3: number;    // 자동 계산 (End - Start)
  
  powerMeterStartKwh: number;   // 방지시설 전력 전일 지침
  powerMeterEndKwh: number;     // 방지시설 전력 당일 지침
  dailyPowerUsageKwh: number;   // 자동 계산 (End - Start)
  
  wastewaterTreatedL: number;   // 폐수 정화 처리량 (L)
  chemicals: {
    pacKg: number;              // 응집제(PAC) 투입량 (kg)
    causticSodaKg: number;      // 가성소다(NaOH) 투입량 (kg)
    defoamerL: number;          // 소포제 투입량 (L)
  };
  
  sludge: {
    generatedKg: number;        // 발생 슬러지
    storedTotalKg: number;      // 침전조 내 누적 보관량
    disposedKg: number;         // 당일 위탁 반출량
    disposalContractor?: string;// 위탁 수거업체명
    manifestNumber?: string;    // 폐기물 인계 전자인계서 번호
  };
  
  oilSeparatorCleaned: boolean; // 유수분리조 유막 제거 여부
  inspectorSignature: string;   // 작성자 서명
}
```

---

## 4. 이상 징후 감지 규칙
- **배관 누수 감지**: 세차 대수 대비 일일 상수도 사용량이 400 L/대를 초과할 경우 누수 경보 알림
- **슬러지 포화 경보**: 침전조 슬러지 누적 보관량이 허가 기준 용량의 80%에 도달할 경우 위탁 수거업체 호출 알림

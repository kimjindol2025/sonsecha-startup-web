# [기획서] 장비 AS 관리 앱 (Equipment After-Service App)

> **카테고리**: 01 운영·관리 (A급 · 현장 필수)  
> **앱 ID**: `app-ops-equipment-as`  
> **목적**: 노터치 세차기, 초고압 펌프, 블로어(건조기), 콤프레셔 등 고장 발생부터 엔지니어 출장, 부품 교체, 수리 완료 및 비용 정산까지의 전 과정을 추적 관리

---

## 1. 서비스 개요 및 타깃
- **대상 사용자**: 세차장 점주, 현장 관리자, 장비 제조사/AS 엔지니어
- **핵심 가치**:
  - 전화/카톡으로 산발 접수되던 고장 이력을 단일 티켓으로 표준화
  - 동일 부위 반복 고장 원인 추적 및 부품 수명 주기 파악
  - 수리비 견적서, 사진 증빙, 교체 부품 보증기간(A/S Warranty) 관리

---

## 2. 주요 기능 요구사항

| 기능 ID | 기능명 | 상세 설명 |
| :--- | :--- | :--- |
| `FEAT-EQ-01` | **고장 티켓 원클릭 접수** | 증상 선택(수압 저하, 센서 오류, 노즐 누수 등), 사진/동영상 첨부, 긴급도(상/중/하) 설정 |
| `FEAT-EQ-02` | **AS 배차 및 진행 추적** | 접수 → 기사 배정 → 부품 수급 → 출장 방문 → 수리 완료 5단계 상태 트래킹 |
| `FEAT-EQ-03` | **부품 교체 및 비용 관리** | 교체 부품명, 파트 번호, 부품비, 공임비, 보증기간(개월) 기록 |
| `FEAT-EQ-04` | **가동 중단(Downtime) 계산** | 고장 시점부터 수리 완료 시점까지 정지시간 및 시간당 예상 손실액 산출 |

---

## 3. 데이터 입력 스키마

```typescript
export interface EquipmentASTicket {
  ticketId: string;             // "AS-202611-001"
  bayId: string;                // "bay-1" | "bay-2" | "common"
  equipmentCategory: 'touchless_gantry' | 'high_pressure_pump' | 'blower' | 'compressor' | 'boiler' | 'vacuum';
  symptomType: string;          // "노즐 압력 저하", "갠트리 레일 탈선", "오일 누유" 등
  urgency: 'critical' | 'high' | 'normal'; // critical: 베이 전체 폐쇄
  photoUrls: string[];          // 고장 부위 사진
  downtimeStart: string;        // ISO 8601
  downtimeEnd?: string;         // 수리 완료 시각
  assignedCompany: string;      // AS 업체명 (예: OOO 머시너리)
  engineerName: string;         // 방문 엔지니어
  engineerPhone: string;
  status: 'reported' | 'dispatched' | 'parts_waiting' | 'in_repair' | 'completed';
  replacedParts: Array<{
    partName: string;
    partCode: string;
    quantity: number;
    unitPrice: number;
    warrantyMonths: number;
  }>;
  totalCost: number;            // 부품비 + 공임비 + 출장비
  repairNotes: string;          // 엔지니어 점검 소견 및 조치 사항
}
```

---

## 4. 화면 와이어프레임 구성
1. **AS 티켓 접수 폼**: 장비 선택(사진 기반), 증상 체크박스, 사진 첨부 모바일 카메라 연동
2. **AS 진행 현황 칸반 보드**: [접수됨] → [기사 출장중] → [수리 진행중] → [완료]
3. **설비별 정비 이력 대장**: 베이별 과거 수리 내역 및 부품 교체 누적 비용 차트

---

## 5. 기대 효과
- 고장 정지시간 40% 단축 (사전 증상 사진 공유로 부품 지참 출장 유도)
- 장비사 과다 수리비 청구 방어 및 동일 고장 무상 AS 보증권 행사

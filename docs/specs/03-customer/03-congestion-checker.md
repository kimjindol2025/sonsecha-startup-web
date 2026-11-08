# [기획서] 세차장 혼잡도 확인 앱 (Carwash Congestion Checker App)

> **카테고리**: 03 고객용 앱 (B급 · 수익화)  
> **앱 ID**: `app-cust-congestion-check`  
> **목적**: 방문 전 현재 사용 중인 세차 베이 수, 대기 중인 차량 수, 예상 대기 시간을 실시간 확인하여 헛걸음과 대기 스트레스를 방지

---

## 1. 서비스 개요 및 타깃
- **대상 사용자**: 주말에 30분 이상 줄 서서 기다리는 것을 피하고 싶은 바쁜 직장인/운전자
- **핵심 가치**:
  - 실시간 베이 가동 현황 (3개 베이 중 2개 가동 중, 1개 빈자리)
  - 대기 차량 대수 및 예상 진입 시간 (예: 대기 3대, 예상 12분 대기)
  - 시간대별 혼잡도 예측 차트 (맑은 일요일 14시~16시 피크 피하기 추천)

---

## 2. 혼잡도 데이터 수집 메커니즘
1. **IoT / 키오스크 결제 신호 연동**: 베이별 세차 시작/종료 신호 감지
2. **진입 LPR 카메라 대기열 카운팅**: 입차 차단기 앞 대기 차량 번호판 인식
3. **사용자 크라우드소싱 제보**: 현장 이용 고객의 [여유 / 보통 / 혼잡 / 만차] 1초 평가

---

## 3. 데이터 스키마 및 대기시간 계산

```typescript
export interface LiveCongestionStatus {
  carwashId: string;
  totalBays: number;            // 총 베이 수 (예: 3)
  occupiedBays: number;         // 현재 가동 중인 베이 (예: 3)
  waitingCarsCount: number;     // 대기열 차량 수 (예: 2)
  congestionLevel: 'smooth' | 'moderate' | 'congested' | 'full';
  estimatedWaitMinutes: number; // 예상 대기 시간
  lastUpdated: string;          // ISO 8601
}
```

### 예상 대기시간 계산 공식
$$\text{예상 대기시간(분)} = \frac{\text{대기 차량수} \times \text{평균 1대당 세차시간 (약 6분)}}{\text{총 베이 수}}$$
- 예: 3개 베이 매장에 대기 3대일 때 $\rightarrow (3 \times 6) \div 3 = 6$분 대기

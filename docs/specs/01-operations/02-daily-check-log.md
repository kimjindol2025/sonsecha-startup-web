# [기획서] 세차장 점검일지 앱 (Daily Inspection Log App)

> **카테고리**: 01 운영·관리 (A급 · 현장 필수)  
> **앱 ID**: `app-ops-daily-check`  
> **목적**: 일일·주간·월간 정기 점검, 고압세척기 수압, 동절기 동파 방지 밸브, 배수로 청소 등 현장 설비 상태를 체계적으로 기록하고 관리 공백을 방지

---

## 1. 서비스 개요 및 타깃
- **대상 사용자**: 세차장 점주, 교대 근무 직원, 시설 관리 용역팀
- **핵심 가치**:
  - 종이 체크리스트 대신 모바일 터치 한 번으로 점검 완료
  - 계절별 특화 점검 (동절기 열선/보일러, 하절기 배수로 악취/모기)
  - 미점검 항목 발생 시 점주 스마트폰 알림

---

## 2. 점검 주기별 세부 항목

### (1) 일일 필수 점검 (Daily - 매일 오픈/마감 시)
- [ ] 고압 펌프 압력 게이지 확인 (80 ~ 100 bar 정상 범위)
- [ ] 노즐 분사 패턴 정상 여부 (편향 분사, 막힘 점검)
- [ ] 에어 콤프레셔 압력 및 수분 자동 배출(드레인) 확인
- [ ] 진입로 및 베이 바닥 날카로운 이물질(볼트, 파손 파편) 확인
- [ ] 동절기: 순환수 보일러 설정 온도(45℃) 및 열선 작동 램프 확인

### (2) 주간 정기 점검 (Weekly - 매주 월요일)
- [ ] 갠트리 구동 휠 및 주행 레일 이물질 청소 및 윤활
- [ ] 약품 펌프 호스 연결부 누액 및 에어 흡입 여부
- [ ] 유수분리조 상부 유막(기름 슬러지) 걷어내기 및 흡착포 교체
- [ ] 매트세척건조기 내부 롤러 세척 및 필터 청소

### (3) 월간 정기 점검 (Monthly - 매월 1일)
- [ ] 고압 펌프 오일 레벨 및 변색 여부 (유화 현상 체크)
- [ ] 수질오염 방지시설 모터 펌프 절연 저항 및 진동 측정
- [ ] 키오스크 내부 청소 및 감열 프린터 헤드 알코올 세척
- [ ] 소화기 압력 게이지 및 누전차단기(ELB) 테스트 버튼 점검

---

## 3. 데이터 입력 스키마

```typescript
export interface DailyInspectionLog {
  logId: string;                // "CHK-202611-001"
  checkDate: string;            // YYYY-MM-DD
  inspectorName: string;        // 점검자
  shift: 'morning_open' | 'afternoon' | 'night_close';
  weather: 'clear' | 'rain' | 'snow' | 'freeze_warning';
  outsideTemperature: number;   // 외기온도 (℃)
  
  items: Array<{
    itemId: string;
    category: 'pressure' | 'nozzle' | 'compressor' | 'drain' | 'winter_safety';
    title: string;
    status: 'pass' | 'warning' | 'fail';
    memo?: string;
    photoUrl?: string;
  }>;
  
  overallStatus: 'normal' | 'action_needed';
  actionTakenNotes?: string;
}
```

---

## 4. 이상 징후 알림 로직
- **동파 경보 점검**: 외기온도 영하 3℃ 이하일 때 `winter_safety` 항목 미체크 시 점주에게 긴급 알림 푸시
- **펌프 압력 저하 경보**: 압력 점검 수치가 75 bar 미만으로 2일 연속 기록될 경우 패킹 교체 권장 알림

# 손세차장 창업 로드맵

한국에서 기존 건물을 손세차장으로 용도변경해 창업할 때 필요한 절차를 순서대로 정리한 반응형 웹페이지입니다.

입지 검토부터 건축물 용도변경, 폐수배출시설 신고, 시설공사, 사업자등록까지 총 12단계로 안내합니다.

## 주요 기능

- 손세차장 창업 절차 12단계 체크리스트
- 검토·인허가·공사·개업 단계별 필터
- 단계별 상세 설명 펼치기
- 진행률 자동 계산
- 체크 상태 브라우저 자동 저장
- 준비서류와 주요 실수 안내
- 정부24·국가법령정보센터 원문 링크
- 모바일·태블릿·데스크톱 반응형 화면
- 인쇄용 레이아웃

## 웹페이지

- 운영 페이지: https://sonsecha-startup-guide.bigwash2025a.chatgpt.site
- Gogs 저장소: https://gogs.dclub.kr/kim/sonsecha-startup-web

## 로컬 실행

Node.js가 설치된 환경에서 실행합니다.

```bash
npm install
npm run dev
```

기본 개발 서버 주소:

```text
http://localhost:5173
```

## 프로덕션 빌드

```bash
npm run build
```

빌드 결과물은 `dist/`에 생성됩니다.

이 프로젝트의 빌드 스크립트는 Vite 정적 결과물과 함께 Sites 런타임용 `dist/server/index.js`를 생성합니다.

## 프로젝트 구조

```text
sonsecha-startup/
├── index.html
├── src/
│   ├── main.js
│   └── style.css
├── scripts/
│   └── package.mjs
├── .openai/
│   └── hosting.json
└── package.json
```

## 안내 범위

웹페이지는 일반적인 창업 절차를 안내합니다. 실제 용도변경 가능 여부와 환경 인허가는 다음 조건에 따라 달라질 수 있습니다.

- 소재지의 용도지역·지구
- 지자체 도시계획조례
- 건축물대장상 현재 용도
- 위반건축물 여부
- 공공하수도 연결 조건
- 세차폐수 발생량과 처리방식
- 주차장·진입로·소방시설 기준

임대차계약이나 시설공사를 시작하기 전에 관할 시·군·구청의 건축·도시계획·환경·하수도 담당부서와 건축사에게 확인해야 합니다.

## 기술 구성

- HTML5
- CSS3
- Vanilla JavaScript
- Vite
- LocalStorage

## 라이선스

별도의 라이선스가 명시되기 전까지 모든 권리를 보유합니다.

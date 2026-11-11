# 개편 구현명세

GitHub Pages master 배포본을 개편한다. 191 운영 서버와 dclub 사이트는 변경하지 않는다.

- index.html: 새 편집형 메인. 주요 메뉴, 단계 선택, 검색·분류, 추천 글, 20단계와 제품·상담 연결.
- guide.html: 기존 index를 보존. 기존 DOM ID, 저장 키, 상품·계획·후보지 모듈 유지. 기존 root hash 북마크를 이 페이지로 전달.
- public/guides/*.html: 자체 작성 실무 가이드 6개. 고유 title, description, canonical, H1, 초기 HTML 본문, 목차, 연관 글. 상담은 운영 사이트로 연결.
- public/portal.css, public/wash-studio.svg: 독자 디자인과 벡터 일러스트.
- src/portal.js: 메모리 기반 검색·분류, 접근 가능한 모바일 메뉴. 사용자 기록을 읽거나 수정하지 않음.
- scripts/generate-editorial.mjs: 콘텐츠 데이터로 정적 메인·글 생성. Vite 빌드 전에 실행.
- src/legacy-entry.js: GitHub Pages에서 서버 접수 버튼을 안내로 대체. 기존 브라우저 자료를 외부 사이트에 자동 복사하지 않음.

분류는 입지·허가, 계약·비용, 시공·장비, 운영 노하우. 단계 선택과 검색은 함께 적용하며 결과 수와 빈 결과 표시. 검색 값은 URL·서버에 보내지 않는다.

실제 GitHub 본체는 노터치·손세차 복합 20단계다. 12단계로 축소하지 않는다. 기존 저장소 형식·API·관리 기능은 변경하지 않는다.

검증: Pages base 빌드, 전체 정적 링크·이미지, 360/390/768/1440px 가로 넘침, 키보드 메뉴, 필터·검색·빈 결과, 초기 HTML 본문, hash 호환, 기존 계획·체크·장바구니 저장 복원. 실패·미실행은 PASS 처리하지 않음.

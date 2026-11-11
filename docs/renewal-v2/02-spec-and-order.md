# v2 구현명세와 작업 지시

대상은 GitHub Pages master. dclub와 191 변경 없음.

1. 메인은 셀프·손세차, 토목·건축·제조·설치·오픈 서비스 중심으로 구성.
2. 정적 서비스 페이지 6개와 상담 준비 페이지 생성. 공개 사진 없는 시공 실적은 작성하지 않음. 제품 사진은 제품 이미지로 명시.
3. 공통 메뉴를 메인·가이드·리서치·신규 서비스·실무 글에 적용. 로고는 항상 새 메인. GPT 메뉴 없음.
4. guide.html의 원본 20단계·계획·상품·저장 키 보존. 후보지는 #candidate-record, 실무 목록은 #field-guide로 구분.
5. 셀프·손세차용 준비 목록은 각 페이지에서 별도 저장 키로 제공. 기존 20단계 판정이나 인허가 완료로 간주하지 않음.
6. 상담은 브라우저에서 요약·복사 후 실제 운영 사이트 또는 전화 연결. 자동 전달·가짜 접수 없음.
7. 기존 report main 내용·출처·날짜는 바꾸지 않고 외부 공통 헤더만 교체.
8. 빌드, 모든 공개 페이지 링크, 모바일 프레임, 메뉴·계획·후보지·장바구니 복원·상담 요약 확인 후 master에 반영하고 배포 확인.

생성: generate-editorial → generate-business → Vite → package. 공통 header/footer는 scripts/site-layout.mjs. public/business.css는 전역 body를 바꾸지 않고 공통 nav·service 영역만 구성.

const common = '이 글과 사이트의 안내는 일반적인 준비 정보이며 법률 자문이나 허가 완료 판정이 아닙니다. 관계 법령·지자체 조례·보험 약관에 따라 요구 사항이 달라질 수 있으므로 최종 확인은 관할 기관과 전문가에게 요청하세요.';
const make = (slug, category, title, description, next, link) => ({ slug, category, title, description, intro: description, sections: [], site: `BIGWASH에서 운영 관련 서류와 확인 상태를 기록하고, 필요한 부분을 관리자 상담으로 연결할 수 있습니다. ${common}`, next, link });
export const operationsPosts = [
  make('business-registration', '개업·운영 01', '사업자등록 서류, 인허가 완료 후 신청해야 하는 이유', '폐수 신고·용도변경·임대차 자료를 사업자등록 전에 준비하는 순서를 정리합니다.', '다음은 보험 가입자료와 고객 차량 손해 담보를 확인하세요.', '/blog/business-insurance'),
  make('business-insurance', '개업·운영 02', '세차장 보험, 일반 배상책임만으로 충분하지 않은 이유', '시설배상·수탁자동차·화재·산재 관련 담보를 비교할 때 확인할 내용을 안내합니다.', '세제와 약품을 사용하는 만큼 MSDS와 직원 교육 자료를 준비하세요.', '/blog/msds-management'),
  make('msds-management', '개업·운영 03', '세차장 MSDS, 제품별로 비치하고 직원 교육까지 해야 합니다', '세차 약품의 성분자료·보관·혼합 금지와 교육 기록을 관리하는 방법입니다.', '개업 후에는 폐수시설 운영기록을 매일 남기는 체계를 만드세요.', '/blog/wastewater-operation-log'),
  make('wastewater-operation-log', '개업·운영 04', '폐수시설 운영기록부, 매일 한 줄이라도 남겨야 하는 이유', '가동시간·용수량·약품·시설상태·특이사항을 운영일지로 기록하는 방법입니다.', '일일·주간·월간 시설 점검표를 나눠 준비하세요.', '/blog/facility-inspection'),
  make('facility-inspection', '개업·운영 05', '세차장 시설 점검표, 일일·주간·월간으로 나누는 방법', '배수·기계·전기·약품·소방·폐수시설 점검 주기를 운영표로 만드는 방법입니다.', '직원을 채용한다면 근로계약서와 4대보험을 함께 확인하세요.', '/blog/employee-contract'),
  make('employee-contract', '개업·운영 06', '세차장 직원 근로계약서, 1명이라도 서면으로 작성해야 합니다', '임금·시간·휴일·업무·보험과 안전교육을 채용 단계에서 정리합니다.', '고객 차량을 받기 전 입고확인서를 준비하세요.', '/blog/vehicle-intake'),
  make('vehicle-intake', '개업·운영 07', '고객 차량 입고확인서, 파손 분쟁 전에 준비할 기록', '기존 흠집·차량 옵션·사진·고객 서명을 입고 단계에서 남기는 방법입니다.', '파손이 발생했을 때의 대응 기준도 직원과 공유하세요.', '/blog/vehicle-damage-response'),
  make('vehicle-damage-response', '개업·운영 08', '차량 파손 대응기준, 사고가 났을 때의 순서 정하기', '증거 확보·과실 확인·보험 접수·합의 기록을 단계별로 정리합니다.', '슬러지와 빈 용기 등 폐기물 처리 자료를 준비하세요.', '/blog/operation-waste'),
  make('operation-waste', '개업·운영 09', '세차장 폐기물 처리자료, 계약서와 인계기록을 함께 남기기', '슬러지·빈 용기·위탁업체 허가·전자 인계기록을 관리하는 방법입니다.', '개업 전 인허가·보험·근로·운영기록을 최종 점검하세요.', '/permit')
];

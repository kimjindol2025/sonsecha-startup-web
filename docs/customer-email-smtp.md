# 고객 문의 Gmail SMTP 설정

공개 화면의 `의견 보내기`와 `후보지 검토 요청` 제출은 기존 저장 처리를 마친 뒤 Gmail SMTP로 `bigwash2025@gmail.com`에 전달합니다. 후보지 검토 요청 메일에는 접수번호, 연락처, 선택적으로 공유한 후보지 주소·형태·단계별 메모와 검토 질문이 포함됩니다.

## 필요한 환경변수

실행 프로세스의 환경에 아래 값을 설정하세요. `SMTP_APP_PASSWORD`에는 Gmail 일반 비밀번호가 아니라 Google 계정에서 발급한 앱 비밀번호를 사용합니다.

```bash
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=465
export SMTP_SECURE=true
export SMTP_USER=your-gmail-account@example.com
export SMTP_APP_PASSWORD='여기에-앱-비밀번호-설정'
```

수신자는 기본적으로 `bigwash2025@gmail.com`이며, 필요할 때만 `INQUIRY_RECIPIENT` 환경변수로 변경할 수 있습니다. 앱 비밀번호는 저장소, 코드, 채팅, 로그에 기록하지 말고 PM2·systemd·호스팅 제공자의 비밀 환경변수 기능으로 주입하세요. 설정 후 운영 프로세스를 재시작해야 합니다.

환경변수가 없거나 형식이 잘못되면 서버는 계속 실행되며, 두 제출 API가 `503 SMTP_NOT_CONFIGURED`와 설정 안내 메시지를 반환합니다. SMTP 인증·전송 실패는 `502 SMTP_SEND_FAILED`로 반환됩니다.

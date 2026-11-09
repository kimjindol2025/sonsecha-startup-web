# 고객 문의 Gmail SMTP 설정

공개 화면의 `의견 보내기`와 `후보지 검토 요청` 제출은 이름·전화번호·이메일을 필수로 입력받은 뒤 Gmail SMTP로 `bigwash2025@gmail.com`에 전달합니다. 입력한 이메일은 관리자 답장을 위한 `Reply-To`로 사용합니다. 후보지 검토 요청 메일에는 접수번호, 연락처, 선택적으로 공유한 후보지 주소·형태·단계별 메모와 검토 질문이 포함됩니다. 접수 후 상담 대화방에서 사용자가 추가로 보낸 메시지도 같은 수신자에게 전달됩니다.

## 필요한 환경변수

대화형 설정 스크립트를 사용하면 앱 비밀번호를 명령행이나 로그에 노출하지 않고 저장할 수 있습니다. 여기서 `SMTP_USER`는 사이트가 Gmail SMTP 인증을 위해 사용하는 관리자 발신 계정입니다. 고객이 문의 폼에 입력한 이메일은 별도로 메일의 `Reply-To`에 들어가므로 고객 이메일을 환경변수에 등록하지 않습니다.

```bash
./scripts/setup-email-env.sh
```

스크립트는 프로젝트 루트의 `.env.smtp`에 권한 `600`으로 저장하고, `run-production.sh`가 서버 시작 때만 읽습니다. `.env.smtp`는 Git에서 제외됩니다.

실행 프로세스의 환경에 아래 값을 설정하세요. `SMTP_APP_PASSWORD`에는 Gmail 일반 비밀번호가 아니라 Google 계정에서 발급한 앱 비밀번호를 사용합니다.

```bash
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=465
export SMTP_SECURE=true
export SMTP_USER=관리자_발신용_Gmail_주소
export SMTP_APP_PASSWORD='여기에-앱-비밀번호-설정'
```

수신자는 기본적으로 `bigwash2025@gmail.com`이며, 필요할 때만 `INQUIRY_RECIPIENT` 환경변수로 변경할 수 있습니다. 앱 비밀번호는 저장소, 코드, 채팅, 로그에 기록하지 말고 PM2·systemd·호스팅 제공자의 비밀 환경변수 기능으로 주입하세요. 설정 후 운영 프로세스를 재시작해야 합니다.

환경변수가 없거나 형식이 잘못되면 서버는 계속 실행되며, 두 제출 API가 `503 SMTP_NOT_CONFIGURED`와 설정 안내 메시지를 반환합니다. SMTP 인증·전송 실패는 `502 SMTP_SEND_FAILED`로 반환됩니다.

#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${SMTP_ENV_FILE:-$SCRIPT_DIR/.env.smtp}"

printf '%s\n' 'Gmail SMTP 설정을 저장합니다. 앱 비밀번호는 화면에 표시하지 않습니다.'
printf '%s\n' '이 주소는 사이트가 메일을 보내는 관리자 Gmail 계정입니다.'
printf '%s\n' '고객 이메일은 사이트 문의 폼에서 입력하며, 관리자 답장 주소로 자동 사용됩니다.'
read -r -p '사이트 발신용 관리자 Gmail 주소: ' smtp_user
read -r -s -p '발신용 Gmail 앱 비밀번호: ' smtp_app_password
printf '\n'
read -r -p '수신 이메일 [bigwash2025@gmail.com]: ' inquiry_recipient
inquiry_recipient="${inquiry_recipient:-bigwash2025@gmail.com}"

if [[ -z "$smtp_user" || -z "$smtp_app_password" ]]; then
  printf '%s\n' '사이트 발신용 관리자 Gmail 주소와 앱 비밀번호는 필수입니다.' >&2
  exit 1
fi

mkdir -p "$(dirname -- "$ENV_FILE")"
umask 077
temp_file="$(mktemp "${ENV_FILE}.XXXXXX")"
trap 'rm -f -- "$temp_file"' EXIT
{
  printf 'SMTP_HOST=smtp.gmail.com\n'
  printf 'SMTP_PORT=465\n'
  printf 'SMTP_SECURE=true\n'
  printf 'SMTP_USER=%q\n' "$smtp_user"
  printf 'SMTP_APP_PASSWORD=%q\n' "$smtp_app_password"
  printf 'INQUIRY_RECIPIENT=%q\n' "$inquiry_recipient"
} > "$temp_file"
chmod 600 "$temp_file"
mv -f -- "$temp_file" "$ENV_FILE"
trap - EXIT

printf '저장 완료: %s\n' "$ENV_FILE"
printf '%s\n' '앱을 재시작하면 적용됩니다. 비밀번호 값은 출력하지 않았습니다.'

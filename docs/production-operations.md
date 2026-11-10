# 운영 배포·복구 절차

이 문서는 `sonsecha-startup-web`의 정식 운영 반영 절차를 고정하기 위한 문서입니다. 운영 데이터와 비밀 환경변수는 Git에 넣지 않습니다.

관리자 인증 파일이 없는 새 환경은 `ADMIN_INITIAL_PASSWORD` 또는 권한이 `600`인 `ADMIN_INITIAL_PASSWORD_FILE`을 일회성으로 제공해야 합니다. 값이 없으면 서버는 시작하지 않으며 비밀번호를 로그에 출력하지 않습니다. 기존 `data/admin-auth.json`이 있으면 이 초기 설정은 사용되지 않습니다.

## 배포 전 확인

```bash
npm ci
npm run build
git diff --check
curl -fsS http://127.0.0.1:40330/healthz
```

변경 파일과 데이터 구조를 확인한 뒤 한 번의 릴리스 커밋으로 반영합니다. 운영 서버의 `data/`, `.env.smtp`, `.ai-product-api-key`는 배포 파일에 포함하지 않습니다.

## 운영 데이터 백업

```bash
./scripts/backup-production-data.sh
```

기본 백업 위치는 프로젝트 상위의 `backups/sonsecha-startup-web`이며 파일 권한은 `600`입니다. `BACKUP_ROOT`와 `BACKUP_RETENTION_DAYS`로 보관 위치와 기간을 조정할 수 있습니다.

백업에는 상품·콘텐츠·상담·피드백 데이터가 포함될 수 있으므로 운영자 계정과 동일한 접근 통제를 유지해야 합니다. `admin-auth.json`, `.env*`, 키·인증서 파일은 백업에서 제외합니다. 백업은 운영 서버의 스케줄러에서 예를 들어 다음처럼 매일 실행할 수 있습니다.

```cron
15 3 * * * cd /home/kim/services/sonsecha-startup-web && /home/kim/services/sonsecha-startup-web/scripts/backup-production-data.sh >> /var/log/sonsecha-backup.log 2>&1
30 3 * * * /usr/sbin/logrotate -s /home/kim/.local/state/kim-pm2/sonsecha-logrotate.status /home/kim/services/sonsecha-startup-web/ops/sonsecha-startup-web.logrotate
```

복원 리허설은 운영 데이터에 덮어쓰지 않고 별도 임시 디렉터리에 압축을 풀어 `products.json`, `content.json`, `consultations.sqlite`, `feedback.sqlite` 존재 여부와 SQLite `PRAGMA integrity_check` 결과를 확인합니다. 실제 복원은 서비스 중지·사전 백업·운영자 확인 후 별도 절차로 수행합니다.

## 반영 후 확인

```bash
curl -fsS https://sonsecha.dclub.kr/healthz
curl -fsS https://sonsecha.dclub.kr/api/products
curl -I https://sonsecha.dclub.kr/permit
```

관리자 페이지는 공개 확인 대상이 아니며, 로그인하지 않은 `/admin` 요청이 `/admin/login`으로 이동하는지 별도로 확인합니다.

## 롤백 원칙

1. 배포 전 백업과 릴리스 커밋을 식별합니다.
2. 애플리케이션 코드만 이전 릴리스로 되돌립니다.
3. 상품·상담 데이터는 먼저 백업한 뒤 필요한 경우에만 데이터 복구를 진행합니다.
4. 복구 후 `/healthz`, 공개 상품 API, 상담 API, 관리자 인증을 재검증합니다.

법적·금전적 상담 내용과 고객 개인정보는 테스트 데이터로 운영 검증하지 않습니다.

표준 PM2로 실행하는 환경에서는 `ecosystem.config.cjs`의 `restart_delay`, `exp_backoff_restart_delay`, `max_restarts`를 사용합니다. 현재 호스트의 `kim-pm2`는 동일 앱에 최대 재시작 횟수만 지원하므로, 해당 supervisor가 ecosystem의 backoff 옵션을 지원하는지 배포 전에 확인해야 합니다. 로그는 `ops/sonsecha-startup-web.logrotate`를 매일 실행해 10MB 기준·14개 보관·권한 600으로 회전합니다.

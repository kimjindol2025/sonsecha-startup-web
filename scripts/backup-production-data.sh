#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
DATA_DIR="${ADMIN_DATA_DIR:-$PROJECT_DIR/data}"
BACKUP_ROOT="${BACKUP_ROOT:-$PROJECT_DIR/../backups/sonsecha-startup-web}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

if [[ ! -d "$DATA_DIR" ]]; then
  echo "데이터 디렉터리가 없어 백업하지 않았습니다: $DATA_DIR" >&2
  exit 1
fi
if [[ ! "$RETENTION_DAYS" =~ ^[0-9]+$ ]]; then
  echo "BACKUP_RETENTION_DAYS는 숫자여야 합니다." >&2
  exit 1
fi

umask 077
mkdir -p "$BACKUP_ROOT"
timestamp="$(date +%Y%m%d-%H%M%S)"
archive="$BACKUP_ROOT/data-$timestamp.tar.gz"
data_parent="$(dirname -- "$DATA_DIR")"
data_name="$(basename -- "$DATA_DIR")"

tar --sort=name --owner=0 --group=0 --numeric-owner \
  --exclude='*.tmp' --exclude='*.temp' --exclude='*.log' \
  --exclude="$data_name/admin-auth*" --exclude="$data_name/.env*" \
  --exclude="$data_name/*.key" --exclude="$data_name/*.pem" \
  -czf "$archive" -C "$data_parent" "$data_name"
chmod 600 "$archive"
find "$BACKUP_ROOT" -maxdepth 1 -type f -name 'data-*.tar.gz' -mtime "+$RETENTION_DAYS" -delete

echo "백업 완료: $archive"

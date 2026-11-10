#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-40330}"
export TRUSTED_PROXY_IPS="${TRUSTED_PROXY_IPS:-192.168.45.23}"

SMTP_ENV_FILE="${SMTP_ENV_FILE:-$SCRIPT_DIR/.env.smtp}"
if [[ -f "$SMTP_ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$SMTP_ENV_FILE"
  set +a
fi

AI_PRODUCT_SECRET_FILE="${AI_PRODUCT_SECRET_FILE:-$SCRIPT_DIR/.ai-product-api-key}"
if [[ -z "${AI_PRODUCT_API_KEY:-}" ]]; then
  if [[ -s "$AI_PRODUCT_SECRET_FILE" ]]; then
    AI_PRODUCT_API_KEY="$(<"$AI_PRODUCT_SECRET_FILE")"
  else
    umask 077
    /usr/bin/openssl rand -hex 32 > "$AI_PRODUCT_SECRET_FILE"
    chmod 600 "$AI_PRODUCT_SECRET_FILE"
    AI_PRODUCT_API_KEY="$(<"$AI_PRODUCT_SECRET_FILE")"
  fi
  export AI_PRODUCT_API_KEY
fi

child_pid=''
stopping=0
forward_signal() {
  stopping=1
  if [[ -n "$child_pid" ]]; then
    kill -TERM "$child_pid" 2>/dev/null || true
  fi
}
trap forward_signal INT TERM

restart_delay=1
while true; do
  /usr/bin/node ./server.mjs &
  child_pid=$!
  if wait "$child_pid"; then
    exit_code=0
  else
    exit_code=$?
  fi
  child_pid=''

  if (( stopping == 1 || exit_code == 0 )); then
    exit "$exit_code"
  fi

  echo "[server] child exited with code $exit_code; retrying in ${restart_delay}s" >&2
  sleep "$restart_delay" &
  sleep_pid=$!
  wait "$sleep_pid" || true
  if (( stopping == 1 )); then exit 0; fi
  restart_delay=$((restart_delay * 3 / 2))
  if (( restart_delay > 15 )); then restart_delay=15; fi
done

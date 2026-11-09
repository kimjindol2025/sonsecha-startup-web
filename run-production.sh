#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-40330}"
export TRUSTED_PROXY_IPS="${TRUSTED_PROXY_IPS:-192.168.45.23}"

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

exec /usr/bin/node ./server.mjs

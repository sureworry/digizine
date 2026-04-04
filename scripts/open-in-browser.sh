#!/usr/bin/env bash
# Open digizine in the default browser; start a static server on PORT if none is listening.
# Usage:
#   ./scripts/open-in-browser.sh              → index.html
#   ./scripts/open-in-browser.sh mobile       → preview-mobile.html (390px iframe)
#   ./scripts/open-in-browser.sh URL          → any http(s) URL
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PORT="${PORT:-5173}"

case "${1:-}" in
  '' | index | home)
    PATH_URL="http://127.0.0.1:$PORT/index.html"
    ;;
  mobile | m)
    PATH_URL="http://127.0.0.1:$PORT/preview-mobile.html"
    ;;
  http://* | https://*)
    PATH_URL="$1"
    ;;
  *)
    PATH_URL="http://127.0.0.1:$PORT/index.html"
    ;;
esac

if command -v lsof >/dev/null 2>&1; then
  if ! lsof -i ":$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Starting http.server on port $PORT..."
    python3 -m http.server "$PORT" >/dev/null 2>&1 &
    sleep 0.8
  fi
else
  python3 -m http.server "$PORT" >/dev/null 2>&1 &
  sleep 0.8
fi

if command -v open >/dev/null 2>&1; then
  open "$PATH_URL"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$PATH_URL"
else
  echo "Open this URL in your browser: $PATH_URL"
  exit 1
fi
echo "Opened: $PATH_URL"

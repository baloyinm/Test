#!/usr/bin/env bash
# Production build, serve it (dry run: nothing saved), walk every page at 390 and 1280, stop the server.
set -uo pipefail
PORT="${PORT:-4391}"
npm run build || exit 1
INTAKE_DRY_RUN=1 node tests/e2e/serve.mjs "$PORT" & pid=$!
trap 'kill $pid 2>/dev/null' EXIT
for i in $(seq 1 30); do curl -sf "http://127.0.0.1:$PORT/robots.txt" >/dev/null && break; sleep 1; done
node tests/e2e/walk.mjs "http://127.0.0.1:$PORT"; rc=$?
# Optional UX gate from the shared library: UX_LIB=/path/to/Re-usable-Component
if [ -n "${UX_LIB:-}" ]; then
  B="http://127.0.0.1:$PORT"
  # copy next to node_modules so the script finds playwright-core
  rm -rf node_modules/.ux-gate && cp -r "$UX_LIB/ui/ux-audit-script" node_modules/.ux-gate
  UX_AUDIT_ARGS="--page-dirs pages" UX_GATE_DARK=0 bash node_modules/.ux-gate/ux_gate.sh src $B/ $B/philosophy $B/language-of-luxury $B/advisory $B/experiences $B/contact $B/privacy $B/terms $B/refund-policy || rc=1
fi
exit $rc

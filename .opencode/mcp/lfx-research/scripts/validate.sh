#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CRISOL_ROOT="$(cd "$ROOT/../../.." && pwd)"

echo "[validate] py_compile server/*.py"
python3 -m py_compile "$ROOT/server/config.py" "$ROOT/server/main.py"
echo "  ok — py_compile passed"

echo "[validate] json syntax: flows/investigacion-conocimiento.json"
python3 -m json.tool "$ROOT/flows/investigacion-conocimiento.json" >/dev/null && echo "  ok — JSON valid"

echo "[validate] json syntax: .opencode/knowledge-library/index.json"
python3 -m json.tool "$CRISOL_ROOT/.opencode/knowledge-library/index.json" >/dev/null && echo "  ok — JSON valid"

echo "[validate] json syntax: opencode.json"
python3 -m json.tool "$CRISOL_ROOT/opencode.json" >/dev/null && echo "  ok — opencode.json valid"

echo "[validate] lfx flow placeholder check"
if grep -q '"status": "placeholder"' "$ROOT/flows/investigacion-conocimiento.json"; then
  echo "  ok — placeholder flow present (replace with real Langflow export later)"
fi

echo "[validate] KNOWLEDGE_LIBRARY_HOME isolation"
if grep -q "knowledge-library" "$ROOT/.env.example" && grep -q "knowledge-library" "$CRISOL_ROOT/opencode.json"; then
  echo "  ok — isolated library referenced in .env.example and opencode.json"
fi

if grep -q "biblioteca-conocimientos" "$ROOT/server/config.py"; then
  echo "  warn — config.py mentions legacy path only for migration warning (expected)"
fi

echo "[validate] done"

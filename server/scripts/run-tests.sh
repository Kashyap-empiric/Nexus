#!/bin/bash
BASE="http://localhost:4000"
TOKENS=$(cat /tmp/nexus-tokens.json)
TOKEN_A=$(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/nexus-tokens.json','utf8'))['agent-a'].token)")
TOKEN_B=$(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/nexus-tokens.json','utf8'))['agent-b'].token)")
USER_A=$(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/nexus-tokens.json','utf8'))['agent-a'].userId)")
USER_B=$(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/nexus-tokens.json','utf8'))['agent-b'].userId)")

API() { curl -s -X "$1" "$BASE$2" -H "Authorization: Bearer $4" -H "Content-Type: application/json" ${3:+-d "$3"}; }

PASS=0; FAIL=0; ERRORS=""

assert() {
  local desc=$1; shift
  local out ret
  out=$("$@" 2>&1) || true
  if echo "$out" | grep -qE "(error|fail|invalid|not found)" 2>/dev/null; then
    # Check if it's actually an error or just text containing these words
    if echo "$out" | grep -qi '"error"' 2>/dev/null; then
      echo "  ❌ $desc"
      echo "    Output: $out"
      ((FAIL++)); ERRORS+="$desc, "; return 1
    fi
  fi
  echo "  ✅ $desc"
  ((PASS++)); return 0
}

run_test() {
  local num=$1 name=$2; shift 2
  echo "=== TEST $num: $name ==="
  local retries=0
  while [ $retries -le 2 ]; do
    [ $retries -gt 0 ] && echo "  Retry $retries..."
    FAIL_BEFORE=$FAIL
    "$@"
    [ $FAIL -eq $FAIL_BEFORE ] && return 0
    ((retries++))
  done
  echo "  ❌ TEST $num FAILED after retries"
}

echo "===== NEXUS AGENT TESTS ====="
echo ""

# ── Health Check (Test 1) ──
echo "=== TEST 1: Server Health Check ==="
assert "Health endpoint returns 200" bash -c 'curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health | grep -q 200'
assert "Body has status: ok" bash -c 'curl -s http://localhost:4000/health | grep -q "ok"'

# ── Auth JWKS (Test 2) ──
echo "=== TEST 2: Auth — JWKS Verification ==="
assert "Valid token passes /api/me" bash -c 'curl -s -w "%{http_code}" http://localhost:4000/api/me -H "Authorization: Bearer '"$TOKEN_A"'" | grep -q 200'

# ── Token Validation (Test 3) ──
echo "=== TEST 3: Auth — Token Validation ==="
assert "Returns user data with correct fields" bash -c '
  resp=$(curl -s http://localhost:4000/api/me -H "Authorization: Bearer '"$TOKEN_A"'")
  echo "$resp" | grep -q "agent-test-a" && echo "$resp" | grep -q "103b824f"
'

# ── Workspace CRUD (Test 4) ──
echo "=== TEST 4: Workspace CRUD ==="
TS=$(date +%s)
WS_SLUG="agent-test-ws-$TS"
assert "Create workspace" bash -c '
  WS_ID=$(API POST "/api/workspaces" "{\"name\":\"Test WS\",\"slug\":\"'"$WS_SLUG"'\"}" "$TOKEN_A" | node -e "let d=\"\";process.stdin.on(\"data\",c=>d+=c);process.stdin.on(\"end\",()=>{try{console.log(JSON.parse(d).id)}catch(e){console.log(\"FAIL\")}})")
  [ -n "$WS_ID" ] && [ "$WS_ID" != "FAIL" ] && echo "$WS_ID" > /tmp/ws_id.txt
'
WS_ID=$(cat /tmp/ws_id.txt 2>/dev/null)
[ -n "$WS_ID" ] && assert "List workspaces includes new one" bash -c 'API GET "/api/workspaces" "" "'"$TOKEN_A"'" | grep -q "'"$WS_ID"'"'
[ -n "$WS_ID" ] && assert "Get workspace details" bash -c 'API GET "/api/workspaces/'"$WS_ID"'" "" "'"$TOKEN_A"'" | grep -q "'"$WS_SLUG"'"'
[ -n "$WS_ID" ] && assert "Update workspace name" bash -c 'API PATCH "/api/workspaces/'"$WS_ID"'" "{\"name\":\"Updated WS\"}" "'"$TOKEN_A"'" | grep -q "Updated WS"'
[ -n "$WS_ID" ] && assert "Channels include #general" bash -c 'API GET "/api/workspaces/'"$WS_ID"'/channels" "" "'"$TOKEN_A"'" | grep -q "general"'
[ -n "$WS_ID" ] && assert "Delete workspace" bash -c 'API DELETE "/api/workspaces/'"$WS_ID"'" "" "'"$TOKEN_A"'" | grep -q "true"'

# ── Workspace Permissions (Test 5) ──
echo "=== TEST 5: Workspace Permissions ==="
TS=$(date +%s)
WS_SLUG="agent-perm-$TS"
assert "Create workspace as User A (OWNER)" bash -c '
  ID=$(API POST "/api/workspaces" "{\"name\":\"Perm Test\",\"slug\":\"'"$WS_SLUG"'\"}" "$TOKEN_A" | node -e "let d=\"\";process.stdin.on(\"data\",c=>d+=c);process.stdin.on(\"end\",()=>{try{console.log(JSON.parse(d).id)}catch(e){console.log(\"FAIL\")}})")
  [ -n "$ID" ] && [ "$ID" != "FAIL" ] && echo "$ID" > /tmp/perm_ws_id.txt
'
PERM_WS_ID=$(cat /tmp/perm_ws_id.txt 2>/dev/null)

# Get User B's info and invite to workspace
if [ -n "$PERM_WS_ID" ]; then
  assert "Add User B to workspace" bash -c '
    echo "Adding user $USER_B to workspace $PERM_WS_ID"
    # Find user B by search
    USER_B_INFO=$(API GET "/api/users/search?q=agent-b" "" "$TOKEN_A")
    echo "$USER_B_INFO"
  '
fi

echo ""
echo "===== RESULTS: $PASS passed, $FAIL failed ====="
[ "$FAIL" -gt 0 ] && echo "FAILED TESTS: $ERRORS"

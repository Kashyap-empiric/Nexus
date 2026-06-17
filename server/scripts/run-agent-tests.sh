#!/bin/bash
# Nexus Agent Test Runner
# Runs tests from AGENT_TESTS.md, retries on failure, records results

set -e

BASE="http://localhost:4000"
TOKENS=$(cat /tmp/nexus-tokens.json)
TOKEN_A=$(echo "$TOKENS" | node -e "process.stdin.setEncoding('utf8'); let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>console.log(JSON.parse(d)['agent-a'].token))")
TOKEN_B=$(echo "$TOKENS" | node -e "process.stdin.setEncoding('utf8'); let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>console.log(JSON.parse(d)['agent-b'].token))")
USER_A=$(echo "$TOKENS" | node -e "process.stdin.setEncoding('utf8'); let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>console.log(JSON.parse(d)['agent-a'].userId))")
USER_B=$(echo "$TOKENS" | node -e "process.stdin.setEncoding('utf8'); let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>console.log(JSON.parse(d)['agent-b'].userId))")

API() {
  local method=$1 path=$2 body=$3 token=$4
  local hdrs=(-s -X "$method" "$BASE$path" -H "Authorization: Bearer $token" -H "Content-Type: application/json")
  [ -n "$body" ] && hdrs+=(-d "$body")
  curl "${hdrs[@]}" 2>/dev/null
}

PASS=0 FAIL=0

run_test() {
  local num=$1 name=$2
  shift 2
  echo "=== TEST $num: $name ==="
  local retries=0 out
  while [ $retries -le 2 ]; do
    [ $retries -gt 0 ] && echo "  Retry $retries..." && sleep 1
    out=$("$@" 2>&1) && {
      echo "  ✅ PASSED"
      ((PASS++))
      return 0
    }
    ((retries++))
  done
  echo "  ❌ FAILED (after $((retries-1)) retries)"
  echo "  Output: $out"
  ((FAIL++))
  return 1
}

# ── TEST 2: Auth — JWKS Verification ──
run_test 2 "Auth — JWKS Verification" bash -c '
  # Test valid token - should decode successfully
  curl -s http://localhost:4000/api/me -H "Authorization: Bearer '"$TOKEN_A"'" | grep -q "agent-test-a" && echo "Valid token works"
'

# ── TEST 3: Auth — Token Validation ──
run_test 3 "Auth — Token Validation" bash -c '
  resp=$(curl -s http://localhost:4000/api/me -H "Authorization: Bearer '"$TOKEN_A"'")
  echo "$resp" | grep -q "agent-test-a" && echo "Profile returned correctly"
  echo "$resp" | grep -q "103b824f" && echo "User ID matches"
'

# ── TEST 4: Workspace CRUD ──
TS=$(date +%s)
WS_SLUG="agent-test-ws-$TS"
WS_ID=""
run_test 4 "Workspace CRUD" bash -c '
  # Create workspace
  resp=$(API POST "/api/workspaces" "{\"name\":\"Agent Test WS\",\"slug\":\"'"$WS_SLUG"'\"}" "$TOKEN_A")
  WS_ID=$(echo "$resp" | node -e "process.stdin.setEncoding(\"utf8\"); let d=\"\"; process.stdin.on(\"data\",c=>d+=c); process.stdin.on(\"end\",()=>{try{console.log(JSON.parse(d).id)}catch(e){console.log(\"PARSE_ERROR\")}})")
  [ -z "$WS_ID" ] && { echo "Failed to create workspace: $resp"; exit 1; }
  echo "Created workspace: $WS_ID"
  
  # List workspaces
  API GET "/api/workspaces" "" "$TOKEN_A" | grep -q "$WS_ID" && echo "List OK"
  
  # Get workspace
  API GET "/api/workspaces/$WS_ID" "" "$TOKEN_A" | grep -q "$WS_SLUG" && echo "Get OK"
  
  # Update workspace
  API PATCH "/api/workspaces/$WS_ID" "{\"name\":\"Updated WS\"}" "$TOKEN_A" | grep -q "Updated WS" && echo "Update OK"
  
  # Get channels - should have #general
  API GET "/api/workspaces/$WS_ID/channels" "" "$TOKEN_A" | grep -q "general" && echo "Channels have #general OK"
  
  # Delete workspace
  API DELETE "/api/workspaces/$WS_ID" "" "$TOKEN_A" | grep -q "true" && echo "Delete OK"
  
  # Verify deleted
  API GET "/api/workspaces/$WS_ID" "" "$TOKEN_A" | grep -q "not found" && echo "Verified deleted"
'

# Exit if any failures so far
[ "$FAIL" -gt 0 ] && { echo "STOPPING: $FAIL test(s) failed. Please fix before continuing."; exit 1; }

echo "=== Results: $PASS passed, $FAIL failed ==="

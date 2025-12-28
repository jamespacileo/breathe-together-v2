#!/usr/bin/env bash
# system-order-guard.sh
# Prevents reordering of the critical 7-phase ECS system execution sequence
# The order in providers.tsx is essential for correct data flow
#
# Triggers: Edit to src/providers.tsx
# Exit codes: 0 (order preserved), 2 (order violation)

set -e

# Get stdin JSON input from Claude Code hook system
input=$(cat <&0)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

# Skip if not reading from JSON input (local execution)
if [ -z "$file_path" ]; then
  # Try to get it from first argument
  file_path="${1:-.}"
fi

# Only validate providers.tsx
if [[ "$file_path" != *"providers.tsx"* ]]; then
  exit 0
fi

echo "🔍 Validating ECS system execution order..."

# The expected system execution order (critical for data flow)
declare -a EXPECTED_ORDER=(
  "breathSystem"
  "particlePhysics"
  "cursorPositionFromLand"
  "velocityTowardsTarget"
  "positionFromVelocity"
  "meshFromPosition"
  "cameraFollowFocused"
)

# Read the file and extract system calls in order
# Look for lines that call the systems within the useFrame callback
ACTUAL_ORDER=$(grep -E "(breathSystem|particlePhysics|cursorPositionFromLand|velocityTowardsTarget|positionFromVelocity|meshFromPosition|cameraFollowFocused)\(" "$file_path" | \
  sed 's/.*\(breathSystem\|particlePhysics\|cursorPositionFromLand\|velocityTowardsTarget\|positionFromVelocity\|meshFromPosition\|cameraFollowFocused\).*/\1/')

# Convert to array
readarray -t ACTUAL_ARRAY <<< "$ACTUAL_ORDER"

# Verify order matches
MISMATCH=0
for i in "${!EXPECTED_ORDER[@]}"; do
  if [[ -z "${ACTUAL_ARRAY[$i]}" ]]; then
    echo "❌ System execution order incomplete!"
    echo "Missing system: ${EXPECTED_ORDER[$i]}"
    MISMATCH=1
    break
  fi

  if [[ "${EXPECTED_ORDER[$i]}" != "${ACTUAL_ARRAY[$i]}" ]]; then
    echo "❌ System execution order violation detected!"
    MISMATCH=1
    break
  fi
done

if [[ $MISMATCH -eq 1 ]]; then
  echo ""
  echo "Expected order (CRITICAL - DO NOT CHANGE):"
  printf '  %d. %s\n' $(seq 1 ${#EXPECTED_ORDER[@]}) "${EXPECTED_ORDER[@]}" | nl -v1
  echo ""
  echo "Detected order:"
  printf '  %d. %s\n' $(seq 1 ${#ACTUAL_ARRAY[@]}) "${ACTUAL_ARRAY[@]}" | nl -v1
  echo ""
  echo "⚠️  System execution order is CRITICAL for correct behavior:"
  echo "    Phase 1 (LOGIC)      → breathSystem calculates global state"
  echo "    Phase 2 (PHYSICS)    → particlePhysics reads breath state"
  echo "    Phase 3 (INPUT)      → cursorPositionFromLand ray-casts"
  echo "    Phase 4 (FORCES)     → velocityTowardsTarget applies forces"
  echo "    Phase 5 (INTEGRATION) → positionFromVelocity integrates"
  echo "    Phase 6 (RENDER SYNC) → meshFromPosition syncs to Three.js"
  echo "    Phase 7 (CAMERA)     → cameraFollowFocused follows entity"
  echo ""
  echo "See providers.tsx lines 49-120 for detailed dependency chain."
  exit 2
fi

echo "✅ System execution order preserved (7 phases intact)"
exit 0

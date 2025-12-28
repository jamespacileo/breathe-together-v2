#!/usr/bin/env bash
# breath-calc-guard.sh
# Prevents breaking changes to core breath calculation logic
# Validates that the 16-second UTC-synchronized breathing cycle remains intact
#
# Triggers: Edit/Write to src/lib/breathCalc.ts or src/constants.ts
# Exit codes: 0 (pass), 2 (block)

set -e

# Get stdin JSON input from Claude Code hook system
input=$(cat <&0)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

# Skip if not reading from JSON input (local execution)
if [ -z "$file_path" ]; then
  # Try to get it from first argument
  file_path="${1:-.}"
fi

# Only validate breath calc and constants
if [[ "$file_path" != *"breathCalc.ts"* ]] && [[ "$file_path" != *"constants.ts"* ]]; then
  exit 0
fi

PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")

echo "🔍 Validating breath calculation logic..."

# Run the manual test script
if ! node "$PROJECT_ROOT/test-breath-calc.js" > /tmp/breath-test-output.txt 2>&1; then
  echo "❌ Breath calculation test failed!"
  echo ""
  cat /tmp/breath-test-output.txt
  echo ""
  echo "⚠️  This is a critical file that synchronizes all users globally."
  echo "    The 16-second breath cycle must remain intact."
  echo "    See test-breath-calc.js for validation details."
  exit 2
fi

# Verify critical outputs in test
if ! grep -q "16s cycle configured correctly" /tmp/breath-test-output.txt; then
  echo "❌ Breath cycle validation failed"
  echo ""
  cat /tmp/breath-test-output.txt
  echo ""
  echo "⚠️  The 16-second cycle is broken. This will desynchronize all users."
  exit 2
fi

if ! grep -q "UTC synchronization ready for global sync" /tmp/breath-test-output.txt; then
  echo "❌ UTC sync validation failed"
  echo ""
  cat /tmp/breath-test-output.txt
  echo ""
  echo "⚠️  Global synchronization is broken. All users will see different breath phases."
  exit 2
fi

echo "✅ Breath calculation validated (16s cycle, UTC sync verified)"
exit 0

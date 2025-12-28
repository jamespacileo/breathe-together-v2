#!/usr/bin/env bash
# typecheck.sh
# Validates TypeScript strict mode passes for all code changes
# Ensures type safety before changes are committed
#
# Triggers: Edit/Write to *.ts, *.tsx
# Exit codes: 0 (no errors), 2 (type errors found)

set -e

# Get stdin JSON input from Claude Code hook system
input=$(cat <&0)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

# Skip if not reading from JSON input (local execution)
if [ -z "$file_path" ]; then
  # Try to get it from first argument
  file_path="${1:-.}"
fi

# Only check TypeScript files
if [[ "$file_path" != *.ts* ]]; then
  exit 0
fi

PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")
cd "$PROJECT_ROOT"

echo "🔍 Running TypeScript type check..."

# Run tsc with strict settings
# Capture output to check for errors
if ! npm run typecheck 2>&1 | head -50 > /tmp/tsc-output.txt; then
  echo "❌ TypeScript errors detected:"
  echo ""
  cat /tmp/tsc-output.txt
  echo ""
  echo "💡 Fix type errors before proceeding."
  echo "   Run: npm run typecheck"
  echo "   for full error details."
  exit 2
fi

# Check if output contains error keyword (fallback)
if grep -qi "error TS" /tmp/tsc-output.txt; then
  echo "❌ TypeScript errors detected:"
  echo ""
  cat /tmp/tsc-output.txt
  echo ""
  echo "💡 Fix type errors before proceeding."
  exit 2
fi

echo "✅ TypeScript validation passed (strict mode)"
exit 0

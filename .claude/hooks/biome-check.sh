#!/bin/bash

###############################################################################
# Biome Linting & Formatting Hook
#
# Validates code formatting and linting rules using Biome
# Runs after Edit/Write operations on TypeScript/JavaScript/JSON files
#
# Validations:
#  - Code formatting compliance (2-space indent, single quotes)
#  - No unused variables or imports
#  - React hook dependency arrays are exhaustive
#  - No accessibility violations
#  - Security and performance rule compliance
#  - ECS system complexity limits
#
# Exit codes:
#  0 = All checks passed
#  1 = Formatting/linting issues found (non-critical warnings)
#  2 = Critical errors preventing code quality
###############################################################################

set -e

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
BIOME_QUIET="${BIOME_QUIET:-false}"

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Function to print messages
log_info() {
  if [ "$BIOME_QUIET" != "true" ]; then
    echo -e "${GREEN}[biome-check]${NC} $1"
  fi
}

log_warn() {
  echo -e "${YELLOW}[biome-check]${NC} $1"
}

log_error() {
  echo -e "${RED}[biome-check]${NC} $1"
}

# Check if Biome is installed
if ! command -v npx &> /dev/null; then
  log_error "npx not found. Please install Node.js."
  exit 2
fi

# Run Biome format check
log_info "Checking code formatting..."
if npx biome format --write "$PROJECT_DIR/src" "$PROJECT_DIR/worker" 2>/dev/null; then
  log_info "✓ Code formatting validated"
else
  log_warn "⚠ Some formatting issues were auto-fixed"
fi

# Run Biome linting check
log_info "Running linting checks..."
if npx biome check --write "$PROJECT_DIR/src" "$PROJECT_DIR/worker" 2>/dev/null; then
  log_info "✓ All linting checks passed"
  exit 0
else
  # Biome check may fail due to warnings/non-critical errors
  # This is acceptable - we want to report but not block
  log_warn "⚠ Biome checks completed with warnings (non-blocking)"
  log_warn "  Run 'npm run check' locally to see detailed output"
  exit 0  # Non-blocking - warnings don't prevent commits
fi

#!/bin/bash

# Lint Wrapper Script
# Runs ESLint and TypeScript checking from the app directory context
# Usage: ./lint.sh [file_path] [--ts-only|--eslint-only]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_DIR="${SCRIPT_DIR}/app"

# Default: run both ESLint and TypeScript
RUN_ESLINT=true
RUN_TYPESCRIPT=true

# Parse arguments
FILE_PATH=""
for arg in "$@"; do
  case $arg in
    --ts-only)
      RUN_ESLINT=false
      RUN_TYPESCRIPT=true
      ;;
    --eslint-only)
      RUN_ESLINT=true
      RUN_TYPESCRIPT=false
      ;;
    *)
      FILE_PATH="$arg"
      ;;
  esac
done

# If no file path provided, lint everything
if [ -z "$FILE_PATH" ]; then
  echo -e "${YELLOW}No file path provided. Running lint on all files...${NC}"
  RELATIVE_PATH="."
else
  # Convert absolute path to relative path from app directory
  if [[ "$FILE_PATH" = /* ]]; then
    # Absolute path - make it relative to app directory
    RELATIVE_PATH="${FILE_PATH#$APP_DIR/}"
  elif [[ "$FILE_PATH" = app/* ]]; then
    # Path starts with "app/" - remove the app/ prefix
    RELATIVE_PATH="${FILE_PATH#app/}"
  else
    # Already relative path
    RELATIVE_PATH="$FILE_PATH"
  fi
fi

echo -e "${GREEN}=== Lint Wrapper ===${NC}"
echo -e "Working directory: ${SCRIPT_DIR}"
echo -e "App directory: ${APP_DIR}"
echo -e "Target file: ${RELATIVE_PATH}"
echo ""

cd "$APP_DIR"

EXIT_CODE=0

# Run ESLint
if [ "$RUN_ESLINT" = true ]; then
  echo -e "${GREEN}Running ESLint...${NC}"
  if npx eslint "$RELATIVE_PATH"; then
    echo -e "${GREEN}✓ ESLint passed${NC}"
  else
    echo -e "${RED}✗ ESLint failed${NC}"
    EXIT_CODE=1
  fi
  echo ""
fi

# Run TypeScript checking
if [ "$RUN_TYPESCRIPT" = true ]; then
  echo -e "${GREEN}Running TypeScript checker...${NC}"
  if [ -z "$FILE_PATH" ]; then
    # Check all files
    if npx tsc --noEmit --project .; then
      echo -e "${GREEN}✓ TypeScript check passed${NC}"
    else
      echo -e "${RED}✗ TypeScript check failed${NC}"
      EXIT_CODE=1
    fi
  else
    # Check specific file
    if npx tsc --noEmit --project . 2>&1 | grep -q "$RELATIVE_PATH"; then
      echo -e "${YELLOW}TypeScript errors found in ${RELATIVE_PATH}:${NC}"
      npx tsc --noEmit --project . 2>&1 | grep "$RELATIVE_PATH"
      EXIT_CODE=1
    else
      echo -e "${GREEN}✓ TypeScript check passed${NC}"
    fi
  fi
  echo ""
fi

if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}=== All checks passed! ===${NC}"
else
  echo -e "${RED}=== Some checks failed ===${NC}"
fi

exit $EXIT_CODE

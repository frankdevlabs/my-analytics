#!/bin/bash

###############################################################################
# Deployment Script for My Analytics
#
# This script handles deployment to production with the following features:
# - Dry-run mode for testing
# - Comprehensive logging
# - Automatic rollback on failure
# - Health check validation
#
# Usage:
#   ./deploy.sh [--dry-run] [--verbose]
#
# Flags:
#   --dry-run    Show what would happen without executing (safe testing)
#   --verbose    Enable detailed logging with timestamps
#
# Exit Codes:
#   0 - Success
#   1 - Preflight check failed
#   2 - Git pull failed
#   3 - Dependency install failed
#   4 - Migration failed (manual intervention needed)
#   5 - Build failed
#   6 - Service restart failed
#   7 - Health check failed (rollback executed)
###############################################################################

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/home/supergoose/my-analytics"
APP_DIR="$PROJECT_DIR/app"
LOG_FILE="$PROJECT_DIR/deployment.log"
SERVICE_NAME="analytics.service"
HEALTH_URL="http://localhost:3000/api/health"
DRY_RUN=false
VERBOSE=false

# Set production environment
export NODE_ENV=production

# Parse arguments
for arg in "$@"; do
  case $arg in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    *)
      # Unknown option
      ;;
  esac
done

###############################################################################
# Logging Functions
###############################################################################

log() {
  local level=$1
  shift
  local message="$@"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  local color=$NC

  case $level in
    INFO)    color=$BLUE ;;
    SUCCESS) color=$GREEN ;;
    WARNING) color=$YELLOW ;;
    ERROR)   color=$RED ;;
  esac

  # Console output
  echo -e "${color}[$timestamp] [$level] $message${NC}"

  # Log file output (no colors)
  echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

execute() {
  local description="$1"
  shift
  local command="$@"

  if [ "$DRY_RUN" = true ]; then
    log "INFO" "[DRY-RUN] Would execute: $command"
    return 0
  fi

  if [ "$VERBOSE" = true ]; then
    log "INFO" "Executing: $command"
  fi

  if eval "$command"; then
    [ "$VERBOSE" = true ] && log "SUCCESS" "$description - OK"
    return 0
  else
    local exit_code=$?
    log "ERROR" "$description - FAILED (exit code: $exit_code)"
    return $exit_code
  fi
}

###############################################################################
# Preflight Checks
###############################################################################

preflight_checks() {
  log "INFO" "Running preflight checks..."

  # Check if we're in the right directory
  if [ ! -d "$PROJECT_DIR" ]; then
    log "ERROR" "Project directory not found: $PROJECT_DIR"
    exit 1
  fi

  # Check if git repo exists
  if [ ! -d "$PROJECT_DIR/.git" ]; then
    log "ERROR" "Not a git repository: $PROJECT_DIR"
    exit 1
  fi

  # Check disk space (require at least 2GB free)
  local free_space=$(df "$PROJECT_DIR" | tail -1 | awk '{print $4}')
  if [ "$free_space" -lt 2097152 ]; then  # 2GB in KB
    log "ERROR" "Insufficient disk space. At least 2GB required."
    exit 1
  fi

  # Check if systemd service exists
  # Capture output first to avoid SIGPIPE with pipefail when grep -q exits early
  local service_list=$(systemctl list-unit-files 2>/dev/null || true)
  if ! echo "$service_list" | grep -q "$SERVICE_NAME"; then
    log "ERROR" "Systemd service not found: $SERVICE_NAME"
    exit 1
  fi

  # Check if Node.js is available
  if [ "$DRY_RUN" = false ]; then
    if ! command -v node &> /dev/null; then
      log "ERROR" "Node.js not found. Ensure NVM is loaded."
      exit 1
    fi
  fi

  log "SUCCESS" "Preflight checks passed"
}

###############################################################################
# Backup Current State
###############################################################################

backup_state() {
  log "INFO" "Backing up current state..."

  if [ "$DRY_RUN" = true ]; then
    log "INFO" "[DRY-RUN] Would save current commit hash"
    return 0
  fi

  cd "$PROJECT_DIR"
  PREVIOUS_COMMIT=$(git rev-parse HEAD)
  echo "$PREVIOUS_COMMIT" > "$PROJECT_DIR/.last_deploy_commit"

  log "INFO" "Current commit: $PREVIOUS_COMMIT"
  log "SUCCESS" "State backed up"
}

###############################################################################
# Pull Latest Code
###############################################################################

pull_code() {
  # Use DEPLOY_BRANCH env var if set by GitHub Actions, otherwise detect current branch
  local branch="${DEPLOY_BRANCH:-$(git -C "$PROJECT_DIR" rev-parse --abbrev-ref HEAD)}"

  log "INFO" "Pulling latest code from origin/$branch..."

  cd "$PROJECT_DIR"

  # Check if we're already on the latest commit (workflow may have already pulled)
  if [ "$DRY_RUN" = false ]; then
    local current_commit=$(git rev-parse HEAD)
    git fetch origin "$branch" --quiet
    local remote_commit=$(git rev-parse "origin/$branch")

    if [ "$current_commit" = "$remote_commit" ]; then
      log "INFO" "Already on latest commit: $current_commit"
      log "SUCCESS" "Code is up to date"
      return 0
    fi
  fi

  execute "Git fetch" "git fetch origin $branch" || exit 2
  execute "Git reset" "git reset --hard origin/$branch" || exit 2

  if [ "$DRY_RUN" = false ]; then
    NEW_COMMIT=$(git rev-parse HEAD)
    log "INFO" "Updated to commit: $NEW_COMMIT"
  fi

  log "SUCCESS" "Code updated successfully"
}

###############################################################################
# Install Dependencies
###############################################################################

install_dependencies() {
  log "INFO" "Installing dependencies..."

  cd "$APP_DIR"

  # Load NVM if not already loaded
  if [ "$DRY_RUN" = false ]; then
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  fi

  execute "Install dependencies" "npm install" || exit 3

  log "SUCCESS" "Dependencies installed"
}

###############################################################################
# Run Database Migrations
###############################################################################

run_migrations() {
  log "INFO" "Running database migrations..."

  cd "$APP_DIR"

  # Ensure .env points to .env.production for Prisma
  if [ "$DRY_RUN" = false ]; then
    if [ -f "$APP_DIR/.env.production" ]; then
      log "INFO" "Linking .env to .env.production..."
      ln -sf .env.production .env
    else
      log "WARNING" ".env.production not found, using existing .env"
    fi
  fi

  if execute "Prisma migrate" "npx prisma migrate deploy"; then
    log "SUCCESS" "Migrations applied successfully"
  else
    log "ERROR" "Migration failed - manual intervention required"
    log "ERROR" "Rolling back deployment..."
    exit 4
  fi
}

###############################################################################
# Build Application
###############################################################################

build_application() {
  log "INFO" "Building application..."

  cd "$APP_DIR"

  # Ensure .env points to .env.production for Next.js build
  if [ "$DRY_RUN" = false ]; then
    if [ -f "$APP_DIR/.env.production" ]; then
      log "INFO" "Ensuring .env -> .env.production symlink..."
      ln -sf .env.production .env
    fi
  fi

  execute "Build tracker" "npm run build:tracker" || exit 5
  execute "Build Next.js" "npm run build" || exit 5

  # Verify build outputs
  if [ "$DRY_RUN" = false ]; then
    if [ ! -d "$APP_DIR/.next" ]; then
      log "ERROR" ".next directory not found after build"
      exit 5
    fi

    if [ ! -f "$APP_DIR/public/fb-a7k2.js" ]; then
      log "ERROR" "Tracker script not built"
      exit 5
    fi
  fi

  log "SUCCESS" "Application built successfully"
}

###############################################################################
# Restart Service
###############################################################################

restart_service() {
  log "INFO" "Restarting systemd service..."

  if [ "$DRY_RUN" = true ]; then
    log "INFO" "[DRY-RUN] Would execute: sudo systemctl restart $SERVICE_NAME"
    return 0
  fi

  if sudo systemctl restart "$SERVICE_NAME"; then
    log "SUCCESS" "Service restarted"
    sleep 5  # Wait for service to start
  else
    log "ERROR" "Service restart failed"
    exit 6
  fi
}

###############################################################################
# Health Check
###############################################################################

health_check() {
  log "INFO" "Running health check..."

  if [ "$DRY_RUN" = true ]; then
    log "INFO" "[DRY-RUN] Would verify: $HEALTH_URL"
    return 0
  fi

  local max_attempts=10
  local attempt=1

  while [ $attempt -le $max_attempts ]; do
    log "INFO" "Health check attempt $attempt/$max_attempts..."

    if curl -f "$HEALTH_URL" > /dev/null 2>&1; then
      log "SUCCESS" "Health check passed!"
      return 0
    fi

    if [ $attempt -lt $max_attempts ]; then
      log "WARNING" "Health check failed, retrying in 5s..."
      sleep 5
    fi

    attempt=$((attempt + 1))
  done

  log "ERROR" "Health check failed after $max_attempts attempts"
  return 1
}

###############################################################################
# Rollback
###############################################################################

rollback() {
  log "ERROR" "Health check failed, initiating rollback..."

  if [ "$DRY_RUN" = true ]; then
    log "INFO" "[DRY-RUN] Would rollback to previous commit"
    return 0
  fi

  if [ -f "$PROJECT_DIR/.last_deploy_commit" ]; then
    ROLLBACK_COMMIT=$(cat "$PROJECT_DIR/.last_deploy_commit")
    log "INFO" "Rolling back to commit: $ROLLBACK_COMMIT"

    cd "$PROJECT_DIR"
    git reset --hard "$ROLLBACK_COMMIT"

    cd "$APP_DIR"
    npm install
    npm run build
    sudo systemctl restart "$SERVICE_NAME"

    log "SUCCESS" "Rollback complete"
  else
    log "ERROR" "No previous commit found for rollback"
  fi

  exit 7
}

###############################################################################
# Main Deployment Flow
###############################################################################

main() {
  local start_time=$(date +%s)

  log "INFO" "========================================="
  log "INFO" "Starting deployment to production"
  log "INFO" "========================================="

  if [ "$DRY_RUN" = true ]; then
    log "WARNING" "DRY-RUN MODE - No changes will be made"
  fi

  # Step 1: Preflight checks
  preflight_checks

  # Step 2: Backup current state
  backup_state

  # Step 3: Pull latest code
  pull_code

  # Step 4: Install dependencies
  install_dependencies

  # Step 5: Run migrations
  run_migrations

  # Step 6: Build application
  build_application

  # Step 7: Restart service (always runs, even if previous steps failed)
  restart_service || true

  # Step 8: Health check
  if ! health_check; then
    rollback
  fi

  # Success!
  local end_time=$(date +%s)
  local duration=$((end_time - start_time))

  log "SUCCESS" "========================================="
  log "SUCCESS" "Deployment completed successfully!"
  log "SUCCESS" "Duration: ${duration}s"
  log "SUCCESS" "========================================="

  exit 0
}

# Run main function
main

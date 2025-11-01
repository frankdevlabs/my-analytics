#!/bin/bash
# Systemd Service Setup Script
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
print_header() { echo -e "\n${BLUE}===================================================${NC}\n${BLUE}$1${NC}\n${BLUE}===================================================${NC}\n"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo -e "${BLUE}→${NC} $1"; }

[[ $EUID -ne 0 ]] && { print_error "Must run with sudo"; exit 1; }

ACTUAL_USER=${SUDO_USER:-$USER}
ACTUAL_HOME=$(eval echo ~$ACTUAL_USER)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

print_header "Analytics Application - Systemd Service Setup"

# Deploy service file
print_header "Deploying Systemd Service"
SERVICE_FILE="$PROJECT_ROOT/deployment/systemd/analytics.service"

if [[ ! -f "$SERVICE_FILE" ]]; then
    print_error "Service file not found: $SERVICE_FILE"
    exit 1
fi

# Update paths in service file for current user
sed -e "s|User=supergoose|User=$ACTUAL_USER|g" \
    -e "s|/home/supergoose|$ACTUAL_HOME|g" \
    "$SERVICE_FILE" > /etc/systemd/system/analytics.service

print_success "Deployed /etc/systemd/system/analytics.service"

# Reload systemd
systemctl daemon-reload
print_success "Reloaded systemd"

# Enable service
systemctl enable analytics.service
print_success "Enabled analytics.service (auto-start on boot)"

# Start service
print_header "Starting Service"
systemctl start analytics.service || { print_error "Service failed to start"; systemctl status analytics.service; exit 1; }
print_success "Started analytics.service"

# Wait for startup
sleep 5

# Check status
if systemctl is-active --quiet analytics.service; then
    print_success "Service is running"
else
    print_error "Service is not running"
    systemctl status analytics.service
    exit 1
fi

print_header "Systemd Service Setup Complete"
systemctl status analytics.service --no-pager

echo -e "\n✓ Service deployed
✓ Auto-start enabled
✓ Service running

Next: sudo bash 05-verify-deployment.sh"
print_success "Systemd service setup completed successfully!"

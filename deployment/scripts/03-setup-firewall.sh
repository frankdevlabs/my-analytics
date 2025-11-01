#!/bin/bash
# Firewall Setup Script - Configure UFW with Cloudflare IP whitelist
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
print_header() { echo -e "\n${BLUE}===================================================${NC}\n${BLUE}$1${NC}\n${BLUE}===================================================${NC}\n"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo -e "${BLUE}→${NC} $1"; }

[[ $EUID -ne 0 ]] && { print_error "Must run with sudo"; exit 1; }

print_header "Analytics Application - Firewall Setup"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Reset UFW
print_header "Resetting UFW"
ufw --force reset
print_success "UFW reset"

# Set default policies
ufw default deny incoming
ufw default allow outgoing
print_success "Set default policies"

# Allow SSH (CRITICAL)
print_header "Allowing SSH"
ufw allow 22/tcp comment 'SSH'
print_success "SSH allowed on port 22"

# Deploy UFW update script
print_header "Deploying Cloudflare IP Update Script"
cp "$PROJECT_ROOT/deployment/scripts/update-cloudflare-ufw.sh" /usr/local/bin/
chmod 755 /usr/local/bin/update-cloudflare-ufw.sh
print_success "Deployed to /usr/local/bin/update-cloudflare-ufw.sh"

# Run UFW update script
print_header "Adding Cloudflare IP Ranges"
/usr/local/bin/update-cloudflare-ufw.sh

# Enable UFW
print_header "Enabling UFW"
ufw --force enable
print_success "UFW enabled"

# Show status
print_header "Firewall Configuration Complete"
ufw status numbered | head -30

echo -e "\n✓ UFW enabled and configured
✓ SSH allowed (port 22)
✓ Cloudflare IPs whitelisted (22 rules)
✓ All other traffic blocked

Next: sudo bash 04-setup-systemd.sh"
print_success "Firewall setup completed successfully!"

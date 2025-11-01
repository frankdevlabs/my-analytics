#!/bin/bash
# ============================================================================
# Nginx Configuration Script
# ============================================================================
# Deploys nginx configurations with Cloudflare integration
# - Backs up existing configuration
# - Deploys global nginx.conf
# - Deploys site-specific configuration
# - Configures log rotation
# - Tests and reloads nginx
#
# This script is idempotent - safe to run multiple times
# ============================================================================

set -e

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

print_header() { echo -e "\n${BLUE}===================================================${NC}\n${BLUE}$1${NC}\n${BLUE}===================================================${NC}\n"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo -e "${BLUE}→${NC} $1"; }

[[ $EUID -ne 0 ]] && { print_error "Must run with sudo"; exit 1; }

print_header "Analytics Application - Nginx Configuration"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DOMAIN=${DOMAIN:-"analytics.franksblog.nl"}

# Backup existing configurations
print_header "Backing Up Existing Configurations"
[[ -f /etc/nginx/nginx.conf ]] && cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S) && print_success "Backed up nginx.conf"
[[ -f /etc/nginx/sites-available/$DOMAIN ]] && cp /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-available/$DOMAIN.backup.$(date +%Y%m%d_%H%M%S) && print_success "Backed up site config"

# Deploy global nginx.conf
print_header "Deploying Global Nginx Configuration"
cp "$PROJECT_ROOT/deployment/nginx/nginx.conf" /etc/nginx/nginx.conf
print_success "Deployed /etc/nginx/nginx.conf"

# Deploy site configuration
print_header "Deploying Site Configuration"
cp "$PROJECT_ROOT/deployment/nginx/sites-available/$DOMAIN" /etc/nginx/sites-available/$DOMAIN || \
  { print_warning "Site config not found, using template";
    sed "s/analytics.franksblog.nl/$DOMAIN/g" "$PROJECT_ROOT/deployment/nginx/sites-available/analytics.franksblog.nl" > /etc/nginx/sites-available/$DOMAIN; }
print_success "Deployed /etc/nginx/sites-available/$DOMAIN"

# Enable site
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN
print_success "Enabled site"

# Remove default site
[[ -L /etc/nginx/sites-enabled/default ]] && rm /etc/nginx/sites-enabled/default && print_success "Removed default site"

# Deploy log rotation
print_header "Configuring Log Rotation"
[[ -f "$PROJECT_ROOT/deployment/nginx/nginx-logrotate" ]] && \
  cp "$PROJECT_ROOT/deployment/nginx/nginx-logrotate" /etc/logrotate.d/nginx && \
  print_success "Deployed log rotation config"

# Test configuration
print_header "Testing Nginx Configuration"
if nginx -t; then
    print_success "Nginx configuration is valid"
else
    print_error "Nginx configuration test failed"
    exit 1
fi

# Reload nginx
systemctl enable nginx
systemctl reload nginx 2>/dev/null || systemctl start nginx
print_success "Nginx reloaded"

print_header "Nginx Configuration Complete"
echo "✓ Global configuration deployed
✓ Site configuration deployed: $DOMAIN
✓ SSL certificates referenced
✓ Cloudflare IP ranges configured
✓ Security headers enabled
✓ Rate limiting configured

Next: sudo bash 03-setup-firewall.sh"
print_success "Nginx configuration completed successfully!"

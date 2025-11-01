#!/bin/bash
# Deployment Verification Script
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
print_header() { echo -e "\n${BLUE}===================================================${NC}\n${BLUE}$1${NC}\n${BLUE}===================================================${NC}\n"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo -e "${BLUE}→${NC} $1"; }

DOMAIN=${DOMAIN:-"analytics.franksblog.nl"}
ERRORS=0

print_header "Analytics Application - Deployment Verification"

# SSL Certificates
print_header "Verifying SSL Certificates"
[[ -f "/etc/nginx/ssl/$DOMAIN.pem" ]] && print_success "Origin certificate exists" || { print_error "Origin certificate missing"; ((ERRORS++)); }
[[ -f "/etc/nginx/ssl/$DOMAIN.key" ]] && print_success "Private key exists" || { print_error "Private key missing"; ((ERRORS++)); }
[[ -f "/etc/nginx/ssl/cloudflare/origin-pull-ca.pem" ]] && print_success "Cloudflare CA exists" || { print_error "Cloudflare CA missing"; ((ERRORS++)); }

# Nginx
print_header "Verifying Nginx"
systemctl is-active --quiet nginx && print_success "Nginx is running" || { print_error "Nginx is not running"; ((ERRORS++)); }
systemctl is-enabled --quiet nginx && print_success "Nginx is enabled" || print_warning "Nginx not enabled for auto-start"
nginx -t &>/dev/null && print_success "Nginx configuration valid" || { print_error "Nginx configuration invalid"; ((ERRORS++)); }

# Firewall
print_header "Verifying Firewall"
ufw status | grep -q "Status: active" && print_success "UFW is active" || { print_error "UFW is not active"; ((ERRORS++)); }
RULE_COUNT=$(ufw status numbered | grep -c "Cloudflare" || echo "0")
[[ $RULE_COUNT -ge 20 ]] && print_success "Cloudflare rules configured ($RULE_COUNT rules)" || { print_warning "Expected 22 Cloudflare rules, found $RULE_COUNT"; }

# Application Service
print_header "Verifying Application Service"
systemctl is-active --quiet analytics.service && print_success "Service is running" || { print_error "Service is not running"; ((ERRORS++)); }
systemctl is-enabled --quiet analytics.service && print_success "Service is enabled" || print_warning "Service not enabled for auto-start"

# Port Check
print_header "Verifying Port 3000"
lsof -i :3000 &>/dev/null && print_success "Port 3000 is listening" || { print_error "Port 3000 is not listening"; ((ERRORS++)); }

# Docker Containers
print_header "Verifying Docker Containers"
if command -v docker &>/dev/null; then
    docker ps --format "{{.Names}}" | grep -q postgres && print_success "PostgreSQL container running" || print_warning "PostgreSQL container not found"
    docker ps --format "{{.Names}}" | grep -q redis && print_success "Redis container running" || print_warning "Redis container not found"
else
    print_warning "Docker not available (may be expected if not using Docker)"
fi

# Application Health
print_header "Verifying Application"
curl -s http://localhost:3000 &>/dev/null && print_success "Application responds on localhost" || { print_error "Application not responding"; ((ERRORS++)); }

# Summary
print_header "Verification Summary"
if [[ $ERRORS -eq 0 ]]; then
    echo -e "${GREEN}All checks passed!${NC}\n"
    echo "Deployment is ready. Configure Cloudflare:"
    echo "  1. Set SSL/TLS mode to 'Full (strict)'"
    echo "  2. Enable Authenticated Origin Pulls"
    echo "  3. Test: https://$DOMAIN"
    echo ""
    echo "See: deployment/docs/CLOUDFLARE_SETUP.md"
else
    echo -e "${RED}Found $ERRORS error(s)${NC}"
    echo "Review errors above and fix before proceeding"
    exit 1
fi

print_success "Deployment verification completed!"

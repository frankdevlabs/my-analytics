#!/bin/bash
# ============================================================================
# Master Deployment Script
# ============================================================================
# Orchestrates complete deployment of Analytics application
# Runs all deployment scripts in sequence with error handling
# ============================================================================

set -e

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; MAGENTA='\033[0;35m'; NC='\033[0m'

print_banner() {
    echo -e "${MAGENTA}"
    echo "============================================================"
    echo "       Analytics Application - Automated Deployment        "
    echo "============================================================"
    echo -e "${NC}"
}

print_header() { echo -e "\n${BLUE}===================================================${NC}\n${BLUE}$1${NC}\n${BLUE}===================================================${NC}\n"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo -e "${BLUE}→${NC} $1"; }

[[ $EUID -ne 0 ]] && { print_error "Must run with sudo"; exit 1; }

print_banner

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
START_TIME=$(date +%s)

# Function to run script with error handling
run_script() {
    local script=$1
    local name=$2

    print_header "[$name] Starting..."

    if bash "$SCRIPT_DIR/$script"; then
        print_success "[$name] Completed successfully"
        return 0
    else
        print_error "[$name] Failed"
        print_info "Check logs above for details"
        return 1
    fi
}

# Confirm before proceeding
echo -e "${YELLOW}This will deploy the Analytics application with:${NC}"
echo "  ✓ System dependencies (Node.js, Docker, nginx)"
echo "  ✓ SSL certificates (Cloudflare Origin CA)"
echo "  ✓ Nginx configuration (reverse proxy, security)"
echo "  ✓ UFW firewall (Cloudflare IP whitelist)"
echo "  ✓ Systemd service (auto-start)"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo
[[ ! $REPLY =~ ^[Yy]$ ]] && { echo "Aborted."; exit 0; }

# Run deployment scripts
print_header "Starting Deployment Pipeline"

run_script "00-install-dependencies.sh" "Install Dependencies" || exit 1
run_script "01-setup-ssl-certificates.sh" "Setup SSL Certificates" || exit 1
run_script "02-configure-nginx.sh" "Configure Nginx" || exit 1
run_script "03-setup-firewall.sh" "Setup Firewall" || exit 1
run_script "04-setup-systemd.sh" "Setup Systemd Service" || exit 1
run_script "05-verify-deployment.sh" "Verify Deployment" || exit 1

# Calculate duration
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

# Success banner
print_header "Deployment Complete!"

echo -e "${GREEN}"
echo "============================================================"
echo "            🎉 Deployment Successful! 🎉                   "
echo "============================================================"
echo -e "${NC}"

echo "Time taken: ${MINUTES}m ${SECONDS}s"
echo ""
echo "Next Steps:"
echo "  1. Configure Cloudflare (see docs/CLOUDFLARE_SETUP.md)"
echo "     - Set SSL/TLS mode to 'Full (strict)'"
echo "     - Enable Authenticated Origin Pulls"
echo "  2. Test application: https://${DOMAIN:-analytics.franksblog.nl}"
echo "  3. Monitor logs: sudo journalctl -u analytics.service -f"
echo ""
echo "Documentation:"
echo "  - Main guide: deployment/README.md"
echo "  - Prerequisites: deployment/docs/PREREQUISITES.md"
echo "  - Cloudflare: deployment/docs/CLOUDFLARE_SETUP.md"
echo "  - Troubleshooting: deployment/docs/TROUBLESHOOTING.md"
echo ""

print_success "All done! Your analytics application is deployed and running."

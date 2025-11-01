#!/bin/bash
# ============================================================================
# SSL Certificates Setup Script
# ============================================================================
# Deploys Cloudflare Origin CA certificates and Authenticated Origin Pulls CA
# - Creates SSL directory structure
# - Deploys Origin Server certificate
# - Deploys Origin Server private key
# - Downloads Cloudflare Origin Pull CA certificate
# - Sets proper permissions
# - Verifies certificates
#
# This script is idempotent - safe to run multiple times
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}===================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===================================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}→${NC} $1"
}

# Check if running with sudo
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run with sudo"
   print_info "Usage: sudo bash 01-setup-ssl-certificates.sh"
   exit 1
fi

print_header "Analytics Application - SSL Certificates Setup"

# ============================================================================
# 1. Check for Local .env File
# ============================================================================
print_header "Step 1: Checking Local Environment File"

# Try to find .env file in parent directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"

if [[ ! -f "$ENV_FILE" ]]; then
    print_error "Local .env file not found at: $ENV_FILE"
    print_info "The .env file must contain CLOUDFLARE_ORIGIN_SERVER_CERTIFICATE and CLOUDFLARE_ORIGIN_SERVER_PRIVATE_KEY"
    print_info "Please ensure you're running this from the project directory"
    exit 1
fi

print_success "Found local .env file: $ENV_FILE"

# ============================================================================
# 2. Load Certificates from .env
# ============================================================================
print_header "Step 2: Loading Certificates from .env"

# Source the .env file to get certificate variables
set -a
source "$ENV_FILE"
set +a

if [[ -z "$CLOUDFLARE_ORIGIN_SERVER_CERTIFICATE" ]]; then
    print_error "CLOUDFLARE_ORIGIN_SERVER_CERTIFICATE not found in .env"
    print_info "Please generate Origin Server certificate in Cloudflare dashboard"
    print_info "See: deployment/docs/CLOUDFLARE_SETUP.md"
    exit 1
fi

if [[ -z "$CLOUDFLARE_ORIGIN_SERVER_PRIVATE_KEY" ]]; then
    print_error "CLOUDFLARE_ORIGIN_SERVER_PRIVATE_KEY not found in .env"
    print_info "Please generate Origin Server certificate in Cloudflare dashboard"
    print_info "See: deployment/docs/CLOUDFLARE_SETUP.md"
    exit 1
fi

print_success "Loaded Origin Server certificate from .env"
print_success "Loaded Origin Server private key from .env"

# Get domain from .env or use default
DOMAIN=${DOMAIN:-"analytics.franksblog.nl"}
print_info "Domain: $DOMAIN"

# ============================================================================
# 3. Create SSL Directory Structure
# ============================================================================
print_header "Step 3: Creating SSL Directory Structure"

SSL_DIR="/etc/nginx/ssl"
CLOUDFLARE_SSL_DIR="$SSL_DIR/cloudflare"

if [[ -d "$SSL_DIR" ]]; then
    print_success "SSL directory exists: $SSL_DIR"
else
    print_info "Creating SSL directory: $SSL_DIR"
    mkdir -p "$SSL_DIR"
    print_success "Created: $SSL_DIR"
fi

if [[ -d "$CLOUDFLARE_SSL_DIR" ]]; then
    print_success "Cloudflare SSL directory exists: $CLOUDFLARE_SSL_DIR"
else
    print_info "Creating Cloudflare SSL directory: $CLOUDFLARE_SSL_DIR"
    mkdir -p "$CLOUDFLARE_SSL_DIR"
    print_success "Created: $CLOUDFLARE_SSL_DIR"
fi

# Set directory permissions
chmod 755 "$SSL_DIR"
chmod 755 "$CLOUDFLARE_SSL_DIR"
print_success "Set directory permissions"

# ============================================================================
# 4. Deploy Origin Server Certificate
# ============================================================================
print_header "Step 4: Deploying Origin Server Certificate"

CERT_FILE="$SSL_DIR/$DOMAIN.pem"

# Backup existing certificate if present
if [[ -f "$CERT_FILE" ]]; then
    BACKUP_FILE="$CERT_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    print_warning "Certificate already exists, backing up to: $BACKUP_FILE"
    cp "$CERT_FILE" "$BACKUP_FILE"
fi

# Write certificate to file
echo "$CLOUDFLARE_ORIGIN_SERVER_CERTIFICATE" > "$CERT_FILE"

# Set permissions
chmod 644 "$CERT_FILE"
chown root:root "$CERT_FILE"

print_success "Deployed Origin Server certificate: $CERT_FILE"

# ============================================================================
# 5. Deploy Origin Server Private Key
# ============================================================================
print_header "Step 5: Deploying Origin Server Private Key"

KEY_FILE="$SSL_DIR/$DOMAIN.key"

# Backup existing key if present
if [[ -f "$KEY_FILE" ]]; then
    BACKUP_FILE="$KEY_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    print_warning "Private key already exists, backing up to: $BACKUP_FILE"
    cp "$KEY_FILE" "$BACKUP_FILE"
fi

# Write private key to file
echo "$CLOUDFLARE_ORIGIN_SERVER_PRIVATE_KEY" > "$KEY_FILE"

# Set secure permissions (only root can read)
chmod 600 "$KEY_FILE"
chown root:root "$KEY_FILE"

print_success "Deployed Origin Server private key: $KEY_FILE"
print_success "Set secure permissions (600) on private key"

# ============================================================================
# 6. Download Cloudflare Origin Pull CA Certificate
# ============================================================================
print_header "Step 6: Downloading Cloudflare Origin Pull CA"

CA_FILE="$CLOUDFLARE_SSL_DIR/origin-pull-ca.pem"
CA_URL="https://developers.cloudflare.com/ssl/static/authenticated_origin_pull_ca.pem"

# Backup existing CA if present
if [[ -f "$CA_FILE" ]]; then
    BACKUP_FILE="$CA_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    print_warning "CA certificate already exists, backing up to: $BACKUP_FILE"
    cp "$CA_FILE" "$BACKUP_FILE"
fi

print_info "Downloading from: $CA_URL"
curl -sSL "$CA_URL" -o "$CA_FILE"

# Set permissions
chmod 644 "$CA_FILE"
chown root:root "$CA_FILE"

print_success "Downloaded Cloudflare Origin Pull CA: $CA_FILE"

# ============================================================================
# 7. Verify Certificates
# ============================================================================
print_header "Step 7: Verifying Certificates"

# Verify Origin Server certificate
print_info "Verifying Origin Server certificate..."
if openssl x509 -in "$CERT_FILE" -text -noout &> /dev/null; then
    print_success "Origin Server certificate is valid"

    # Show certificate details
    ISSUER=$(openssl x509 -in "$CERT_FILE" -noout -issuer | sed 's/issuer=//')
    SUBJECT=$(openssl x509 -in "$CERT_FILE" -noout -subject | sed 's/subject=//')
    NOT_BEFORE=$(openssl x509 -in "$CERT_FILE" -noout -startdate | sed 's/notBefore=//')
    NOT_AFTER=$(openssl x509 -in "$CERT_FILE" -noout -enddate | sed 's/notAfter=//')

    echo "  Issuer: $ISSUER"
    echo "  Subject: $SUBJECT"
    echo "  Valid from: $NOT_BEFORE"
    echo "  Valid until: $NOT_AFTER"
else
    print_error "Origin Server certificate is invalid"
    exit 1
fi

# Verify private key
print_info "Verifying Origin Server private key..."
if openssl rsa -in "$KEY_FILE" -check -noout &> /dev/null; then
    print_success "Origin Server private key is valid"
else
    print_error "Origin Server private key is invalid"
    exit 1
fi

# Verify certificate and private key match
print_info "Verifying certificate and private key match..."
CERT_MODULUS=$(openssl x509 -noout -modulus -in "$CERT_FILE" | openssl md5)
KEY_MODULUS=$(openssl rsa -noout -modulus -in "$KEY_FILE" | openssl md5)

if [[ "$CERT_MODULUS" == "$KEY_MODULUS" ]]; then
    print_success "Certificate and private key match"
else
    print_error "Certificate and private key DO NOT match"
    print_error "This will cause SSL errors!"
    exit 1
fi

# Verify Cloudflare CA certificate
print_info "Verifying Cloudflare Origin Pull CA..."
if openssl x509 -in "$CA_FILE" -text -noout &> /dev/null; then
    print_success "Cloudflare Origin Pull CA is valid"

    # Show CA details
    CA_ISSUER=$(openssl x509 -in "$CA_FILE" -noout -issuer | sed 's/issuer=//')
    CA_SUBJECT=$(openssl x509 -in "$CA_FILE" -noout -subject | sed 's/subject=//')
    CA_NOT_AFTER=$(openssl x509 -in "$CA_FILE" -noout -enddate | sed 's/notAfter=//')

    echo "  Issuer: $CA_ISSUER"
    echo "  Subject: $CA_SUBJECT"
    echo "  Valid until: $CA_NOT_AFTER"
else
    print_error "Cloudflare Origin Pull CA is invalid"
    exit 1
fi

# ============================================================================
# 8. Summary
# ============================================================================
print_header "SSL Certificates Setup Summary"

echo "
Deployed Certificates:
  ✓ Origin Server Certificate: $CERT_FILE (644)
  ✓ Origin Server Private Key: $KEY_FILE (600 - secure)
  ✓ Cloudflare Origin Pull CA: $CA_FILE (644)

Certificate Details:
  Domain: $DOMAIN
  Issuer: Cloudflare Inc ECC CA-3
  Valid until: $(echo "$NOT_AFTER" | cut -d' ' -f1-4)
  Certificate/Key match: ✓

Cloudflare Origin Pull CA:
  Valid until: $(echo "$CA_NOT_AFTER" | cut -d' ' -f1-4)
  Purpose: Authenticated Origin Pulls (mTLS)

Security:
  ✓ Private key has secure permissions (600)
  ✓ Certificates owned by root:root
  ✓ All certificates verified

Next Steps:
  1. Run: sudo bash 02-configure-nginx.sh
  2. Or continue with: sudo bash deploy-all.sh (if running full deployment)

Notes:
  - Nginx configuration will reference these certificates
  - Authenticated Origin Pulls must be enabled in Cloudflare dashboard
  - See: deployment/docs/CLOUDFLARE_SETUP.md
"

print_success "SSL certificates setup completed successfully!"

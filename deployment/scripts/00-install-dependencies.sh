#!/bin/bash
# ============================================================================
# Installation Dependencies Script
# ============================================================================
# Installs all required system dependencies for Analytics application
# - System packages (nginx, git, curl, etc.)
# - Node.js v20.10.0 via NVM
# - Docker and Docker Compose
# - Creates user structure
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
if [[ $EUID -eq 0 && -z "$SUDO_USER" ]]; then
   print_error "This script should be run with sudo, not as root directly"
   print_info "Usage: sudo bash 00-install-dependencies.sh"
   exit 1
fi

if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run with sudo"
   print_info "Usage: sudo bash 00-install-dependencies.sh"
   exit 1
fi

# Get the actual user (not root when using sudo)
ACTUAL_USER=${SUDO_USER:-$USER}
ACTUAL_HOME=$(eval echo ~$ACTUAL_USER)

print_header "Analytics Application - Dependency Installation"
print_info "Installing as user: $ACTUAL_USER"
print_info "Home directory: $ACTUAL_HOME"

# ============================================================================
# 1. Update System Packages
# ============================================================================
print_header "Step 1: Updating System Packages"

print_info "Updating package lists..."
apt-get update -qq

print_info "Upgrading installed packages..."
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y -qq

print_success "System packages updated"

# ============================================================================
# 2. Install System Dependencies
# ============================================================================
print_header "Step 2: Installing System Dependencies"

PACKAGES=(
    "git"
    "curl"
    "wget"
    "build-essential"
    "nginx"
    "ufw"
    "ca-certificates"
    "gnupg"
    "lsb-release"
    "software-properties-common"
    "apt-transport-https"
)

print_info "Installing: ${PACKAGES[*]}"

for package in "${PACKAGES[@]}"; do
    if dpkg -l | grep -q "^ii  $package "; then
        print_success "$package already installed"
    else
        print_info "Installing $package..."
        DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "$package"
        print_success "$package installed"
    fi
done

# ============================================================================
# 3. Install Node.js via NVM
# ============================================================================
print_header "Step 3: Installing Node.js v20.10.0 via NVM"

NVM_VERSION="v0.39.0"
NODE_VERSION="20.10.0"

# Check if NVM is already installed
if su - "$ACTUAL_USER" -c "[ -s ~/.nvm/nvm.sh ]"; then
    print_success "NVM already installed"
else
    print_info "Installing NVM $NVM_VERSION..."
    su - "$ACTUAL_USER" -c "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/$NVM_VERSION/install.sh | bash"
    print_success "NVM installed"
fi

# Load NVM and install Node.js
print_info "Installing Node.js v$NODE_VERSION..."
su - "$ACTUAL_USER" -c "
    export NVM_DIR=\"\$HOME/.nvm\"
    [ -s \"\$NVM_DIR/nvm.sh\" ] && . \"\$NVM_DIR/nvm.sh\"
    nvm install $NODE_VERSION
    nvm use $NODE_VERSION
    nvm alias default $NODE_VERSION
"

# Verify Node.js installation
NODE_PATH=$(su - "$ACTUAL_USER" -c "export NVM_DIR=\"\$HOME/.nvm\"; [ -s \"\$NVM_DIR/nvm.sh\" ] && . \"\$NVM_DIR/nvm.sh\"; which node")
NODE_ACTUAL_VERSION=$(su - "$ACTUAL_USER" -c "export NVM_DIR=\"\$HOME/.nvm\"; [ -s \"\$NVM_DIR/nvm.sh\" ] && . \"\$NVM_DIR/nvm.sh\"; node --version")
NPM_VERSION=$(su - "$ACTUAL_USER" -c "export NVM_DIR=\"\$HOME/.nvm\"; [ -s \"\$NVM_DIR/nvm.sh\" ] && . \"\$NVM_DIR/nvm.sh\"; npm --version")

print_success "Node.js installed: $NODE_ACTUAL_VERSION"
print_success "npm installed: v$NPM_VERSION"
print_info "Node.js path: $NODE_PATH"

# ============================================================================
# 4. Install Docker
# ============================================================================
print_header "Step 4: Installing Docker"

if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | awk '{print $3}' | sed 's/,//')
    print_success "Docker already installed: v$DOCKER_VERSION"
else
    print_info "Installing Docker..."

    # Add Docker's official GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    # Add Docker repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker
    apt-get update -qq
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    print_success "Docker installed"
fi

# Add user to docker group
if groups "$ACTUAL_USER" | grep -q docker; then
    print_success "User $ACTUAL_USER already in docker group"
else
    print_info "Adding $ACTUAL_USER to docker group..."
    usermod -aG docker "$ACTUAL_USER"
    print_success "User $ACTUAL_USER added to docker group"
    print_warning "User needs to log out and back in for docker group to take effect"
fi

# Enable and start Docker service
systemctl enable docker
systemctl start docker
print_success "Docker service enabled and started"

# ============================================================================
# 5. Install Docker Compose (standalone)
# ============================================================================
print_header "Step 5: Verifying Docker Compose"

if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version | awk '{print $4}' | sed 's/,//')
    print_success "docker-compose installed: v$COMPOSE_VERSION"
else
    print_warning "docker-compose not found as standalone command"
    print_info "Docker Compose plugin is installed (use: docker compose)"
fi

# Verify Docker Compose plugin
if docker compose version &> /dev/null; then
    COMPOSE_PLUGIN_VERSION=$(docker compose version --short)
    print_success "Docker Compose plugin installed: v$COMPOSE_PLUGIN_VERSION"
else
    print_error "Docker Compose plugin not found"
    exit 1
fi

# ============================================================================
# 6. Configure Nginx
# ============================================================================
print_header "Step 6: Configuring Nginx"

# Nginx should be installed but not configured yet
systemctl enable nginx
print_success "Nginx service enabled"

# Don't start nginx yet - will configure first
print_info "Nginx will be configured in next script"

# ============================================================================
# 7. Verify Installations
# ============================================================================
print_header "Step 7: Verifying Installations"

# System packages
for package in "${PACKAGES[@]}"; do
    if dpkg -l | grep -q "^ii  $package "; then
        print_success "$package: OK"
    else
        print_error "$package: NOT INSTALLED"
    fi
done

# Node.js
if su - "$ACTUAL_USER" -c "export NVM_DIR=\"\$HOME/.nvm\"; [ -s \"\$NVM_DIR/nvm.sh\" ] && . \"\$NVM_DIR/nvm.sh\"; node --version" | grep -q "$NODE_VERSION"; then
    print_success "Node.js v$NODE_VERSION: OK"
else
    print_error "Node.js v$NODE_VERSION: FAILED"
fi

# Docker
if docker --version &> /dev/null; then
    print_success "Docker: OK"
else
    print_error "Docker: FAILED"
fi

# Docker Compose
if docker compose version &> /dev/null; then
    print_success "Docker Compose: OK"
else
    print_error "Docker Compose: FAILED"
fi

# ============================================================================
# 8. Summary
# ============================================================================
print_header "Installation Summary"

echo "
Installed Components:
  ✓ System packages: git, curl, wget, build-essential, nginx, ufw
  ✓ Node.js: v$NODE_ACTUAL_VERSION (via NVM)
  ✓ npm: v$NPM_VERSION
  ✓ Docker: $(docker --version | awk '{print $3}' | sed 's/,//')
  ✓ Docker Compose: $(docker compose version --short)

User Configuration:
  ✓ User: $ACTUAL_USER
  ✓ Home: $ACTUAL_HOME
  ✓ Docker group: $(groups "$ACTUAL_USER" | grep -q docker && echo "Yes" || echo "No (logout required)")

Next Steps:
  1. If user was added to docker group, logout and login for changes to take effect
  2. Run: sudo bash 01-setup-ssl-certificates.sh
  3. Or continue with: sudo bash deploy-all.sh (if running full deployment)

Notes:
  - Nginx is enabled but not started yet (will configure in next step)
  - Node.js is installed for user $ACTUAL_USER via NVM
  - Docker service is running and enabled
"

print_success "Dependencies installation completed successfully!"

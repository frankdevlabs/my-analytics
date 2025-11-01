# Server Deployment Guide

Complete guide for deploying the Analytics application on a fresh Ubuntu server with optimal Cloudflare integration, security hardening, and performance optimization.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Manual Deployment](#manual-deployment)
5. [Automated Deployment](#automated-deployment)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Maintenance](#maintenance)
8. [Troubleshooting](#troubleshooting)

## Architecture Overview

```
Cloudflare CDN (Edge)
        ↓ (mTLS + IP Whitelist)
    Nginx (Reverse Proxy)
        ↓ (localhost:3000)
    Next.js App (Node.js v20.10.0)
        ↓
    PostgreSQL (Docker) + Redis (Docker)
```

### Security Layers

1. **Edge Protection**: Cloudflare DDoS protection, WAF, bot mitigation
2. **mTLS (Authenticated Origin Pulls)**: Only Cloudflare can establish SSL connection
3. **UFW Firewall**: Only Cloudflare IP ranges + SSH allowed
4. **Nginx**: Rate limiting, security headers, HTTP/2
5. **Application**: NextAuth.js authentication, input validation

### Key Technologies

- **OS**: Ubuntu 22.04 LTS or later
- **Web Server**: Nginx 1.18+ (reverse proxy)
- **Runtime**: Node.js v20.10.0 (via NVM)
- **Process Manager**: systemd
- **Database**: PostgreSQL 17.6 (Docker)
- **Cache**: Redis 7.4 (Docker)
- **SSL/TLS**: Cloudflare Origin CA + Authenticated Origin Pulls (mTLS)
- **Firewall**: UFW with Cloudflare IP whitelist

## Prerequisites

Before deployment, ensure you have:

1. **Server Requirements**
   - Ubuntu 22.04 LTS or later
   - Minimum 2GB RAM, 2 CPU cores
   - 20GB+ available disk space
   - Root or sudo access
   - SSH access configured

2. **Domain & DNS**
   - Domain registered and added to Cloudflare
   - DNS A record pointing to server IP
   - Cloudflare proxy (orange cloud) ENABLED

3. **Cloudflare Account**
   - Active Cloudflare account
   - Domain configured with Cloudflare nameservers
   - Access to SSL/TLS settings

4. **Local Development**
   - Git repository cloned locally
   - `.env` file with `CLOUDFLARE_ORIGIN_SERVER_CERTIFICATE` and `CLOUDFLARE_ORIGIN_SERVER_PRIVATE_KEY`

See [PREREQUISITES.md](docs/PREREQUISITES.md) for detailed requirements.

## Quick Start

For automated deployment (recommended):

```bash
# 1. Clone repository on server
git clone https://github.com/yourusername/my-analytics.git
cd my-analytics

# 2. Configure environment
cp deployment/.env.server.example deployment/.env.server
nano deployment/.env.server  # Fill in your values

# 3. Run automated deployment
cd deployment/scripts
sudo bash deploy-all.sh

# 4. Configure Cloudflare (see CLOUDFLARE_SETUP.md)
```

The automated script will:
- Install all dependencies (Node.js, Docker, Nginx)
- Configure SSL certificates with Cloudflare Origin CA
- Set up Nginx with optimal configuration
- Configure UFW firewall with Cloudflare IP whitelist
- Deploy systemd service for auto-start
- Verify deployment

Total time: ~10-15 minutes

## Manual Deployment

### Step 1: System Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install basic dependencies
sudo apt install -y git curl wget build-essential ufw nginx certbot
```

### Step 2: Install Node.js v20.10.0

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install Node.js v20.10.0
nvm install 20.10.0
nvm use 20.10.0
nvm alias default 20.10.0

# Verify
node --version  # Should output: v20.10.0
npm --version   # Should output: v10.2.3 or similar
```

### Step 3: Install Docker & Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com | sudo sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install -y docker-compose

# Verify
docker --version
docker-compose --version
```

### Step 4: Clone Repository & Configure Environment

```bash
# Clone repository
cd /home/$USER
git clone https://github.com/yourusername/my-analytics.git
cd my-analytics

# Set up Docker infrastructure environment
cp .env.example .env.production
nano .env.production  # Configure PostgreSQL and Redis settings

# Set up application environment
cd app
cp .env.example .env.production
nano .env.production  # Configure database URL, Redis URL, Auth settings

# CRITICAL: Ensure AUTH_URL uses HTTPS
# AUTH_URL="https://analytics.franksblog.nl"  ← HTTPS, not HTTP!
```

### Step 5: Start Database Infrastructure

```bash
# Return to project root
cd /home/$USER/my-analytics

# Start PostgreSQL and Redis
docker-compose up -d

# Verify containers are running
docker-compose ps
# Should show postgres and redis both "Up"

# Wait 10 seconds for PostgreSQL to initialize
sleep 10
```

### Step 6: Initialize Application

```bash
cd app

# Install dependencies
npm install

# Run database migrations
npx prisma migrate deploy

# Create first user (uses FIRST_USER_* env variables)
npm run create-user

# Build application
npm run build
```

### Step 7: Configure SSL Certificates

```bash
# Create SSL directories
sudo mkdir -p /etc/nginx/ssl/cloudflare
sudo chmod 755 /etc/nginx/ssl
sudo chmod 755 /etc/nginx/ssl/cloudflare

# Deploy Origin Server Certificate
# Copy from local .env CLOUDFLARE_ORIGIN_SERVER_CERTIFICATE
sudo tee /etc/nginx/ssl/analytics.franksblog.nl.pem > /dev/null << 'EOF'
-----BEGIN CERTIFICATE-----
[Paste your certificate here]
-----END CERTIFICATE-----
EOF

# Deploy Private Key
# Copy from local .env CLOUDFLARE_ORIGIN_SERVER_PRIVATE_KEY
sudo tee /etc/nginx/ssl/analytics.franksblog.nl.key > /dev/null << 'EOF'
-----BEGIN PRIVATE KEY-----
[Paste your private key here]
-----END PRIVATE KEY-----
EOF

# Set secure permissions
sudo chmod 644 /etc/nginx/ssl/analytics.franksblog.nl.pem
sudo chmod 600 /etc/nginx/ssl/analytics.franksblog.nl.key
sudo chown root:root /etc/nginx/ssl/analytics.franksblog.nl.*

# Download Cloudflare Origin Pull CA
sudo curl -o /etc/nginx/ssl/cloudflare/origin-pull-ca.pem \
  https://developers.cloudflare.com/ssl/static/authenticated_origin_pull_ca.pem

# Set permissions
sudo chmod 644 /etc/nginx/ssl/cloudflare/origin-pull-ca.pem
sudo chown root:root /etc/nginx/ssl/cloudflare/origin-pull-ca.pem

# Verify certificates
openssl x509 -in /etc/nginx/ssl/analytics.franksblog.nl.pem -text -noout | grep -E "Issuer|Subject|Not"
openssl rsa -in /etc/nginx/ssl/analytics.franksblog.nl.key -check
openssl x509 -in /etc/nginx/ssl/cloudflare/origin-pull-ca.pem -text -noout | grep -E "Issuer|Subject|Not"
```

### Step 8: Configure Nginx

```bash
# Backup existing config
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

# Deploy global nginx configuration
sudo cp deployment/nginx/nginx.conf /etc/nginx/nginx.conf

# Deploy site configuration
sudo cp deployment/nginx/sites-available/analytics.franksblog.nl \
  /etc/nginx/sites-available/analytics.franksblog.nl

# IMPORTANT: Update domain names in the config if different
sudo nano /etc/nginx/sites-available/analytics.franksblog.nl
# Replace "analytics.franksblog.nl" with your domain

# Enable site
sudo ln -sf /etc/nginx/sites-available/analytics.franksblog.nl \
  /etc/nginx/sites-enabled/analytics.franksblog.nl

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### Step 9: Configure UFW Firewall

```bash
# Reset UFW (removes all rules)
sudo ufw --force reset

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (CRITICAL - do this first!)
sudo ufw allow 22/tcp comment 'SSH'

# Deploy and run Cloudflare IP update script
sudo cp deployment/scripts/update-cloudflare-ufw.sh /usr/local/bin/
sudo chmod 755 /usr/local/bin/update-cloudflare-ufw.sh
sudo /usr/local/bin/update-cloudflare-ufw.sh

# Enable firewall
sudo ufw --force enable

# Verify rules
sudo ufw status numbered
# Should show:
# - Rule for SSH (22/tcp)
# - 15 rules for Cloudflare IPv4 ranges
# - 7 rules for Cloudflare IPv6 ranges
# Total: 23 rules
```

### Step 10: Configure Systemd Service

```bash
# Deploy service file
sudo cp deployment/systemd/analytics.service /etc/systemd/system/

# IMPORTANT: Update paths in service file if different
sudo nano /etc/systemd/system/analytics.service
# Update User, WorkingDirectory, and ExecStart paths

# Reload systemd
sudo systemctl daemon-reload

# Enable service (auto-start on boot)
sudo systemctl enable analytics.service

# Start service
sudo systemctl start analytics.service

# Check status
sudo systemctl status analytics.service
# Should show "active (running)"

# View logs
sudo journalctl -u analytics.service -f
```

### Step 11: Configure Cloudflare

See [docs/CLOUDFLARE_SETUP.md](docs/CLOUDFLARE_SETUP.md) for detailed Cloudflare configuration:

1. **SSL/TLS Mode**: Set to "Full (strict)"
2. **Origin Server**: Create certificate (if not done already)
3. **Authenticated Origin Pulls**: Enable
4. **Edge Certificates**: Configure as needed
5. **DNS**: Ensure proxy is enabled (orange cloud)

## Automated Deployment

Use the automated deployment scripts for faster, error-free setup:

```bash
cd deployment/scripts

# Full automated deployment
sudo bash deploy-all.sh

# Or run individual scripts in order:
sudo bash 00-install-dependencies.sh
sudo bash 01-setup-ssl-certificates.sh
sudo bash 02-configure-nginx.sh
sudo bash 03-setup-firewall.sh
sudo bash 04-setup-systemd.sh
sudo bash 05-verify-deployment.sh
```

Each script:
- Is idempotent (safe to run multiple times)
- Includes error handling and rollback
- Provides colored output for clarity
- Logs all operations

## Post-Deployment Verification

Run the verification script:

```bash
cd deployment/scripts
sudo bash 05-verify-deployment.sh
```

Manual verification checklist:

1. **SSL/TLS**
   ```bash
   # Test from another machine
   curl -I https://analytics.franksblog.nl
   # Should return 200 OK with security headers
   ```

2. **mTLS (Authenticated Origin Pulls)**
   ```bash
   # Test direct connection (should fail)
   curl -k https://YOUR_SERVER_IP
   # Should return 400 Bad Request (no client certificate)
   ```

3. **Firewall**
   ```bash
   sudo ufw status numbered
   # Should show 23 rules (1 SSH + 22 Cloudflare)
   ```

4. **Application**
   ```bash
   sudo systemctl status analytics.service
   # Should show "active (running)"

   curl http://localhost:3000/api/health
   # Should return health check response
   ```

5. **Database**
   ```bash
   docker-compose ps
   # Both postgres and redis should show "Up"
   ```

6. **Security Headers**
   ```bash
   curl -I https://analytics.franksblog.nl
   # Check for:
   # - Strict-Transport-Security
   # - X-Frame-Options
   # - X-Content-Type-Options
   # - Content-Security-Policy
   ```

## Maintenance

### Updating Cloudflare IP Ranges

Cloudflare updates their IP ranges periodically. Update monthly:

```bash
sudo /usr/local/bin/update-cloudflare-ufw.sh
```

To automate (optional):

```bash
# Add cron job
sudo crontab -e

# Add line (runs monthly on 1st at 3am):
0 3 1 * * /usr/local/bin/update-cloudflare-ufw.sh > /var/log/cloudflare-ufw-update.log 2>&1
```

### Certificate Renewal

Cloudflare Origin CA certificate expires: **October 27, 2040** (15 years)

Before expiration:
1. Generate new certificate in Cloudflare dashboard
2. Update certificate and key files in `/etc/nginx/ssl/`
3. Reload nginx: `sudo systemctl reload nginx`

### Log Rotation

Nginx logs are automatically rotated daily with 14-day retention (configured in `/etc/logrotate.d/nginx`).

Application logs (systemd):
```bash
# View recent logs
sudo journalctl -u analytics.service -n 100

# View logs from last hour
sudo journalctl -u analytics.service --since "1 hour ago"

# Follow logs in real-time
sudo journalctl -u analytics.service -f
```

### Updating Application

```bash
# Pull latest code
cd /home/$USER/my-analytics
git pull origin main

# Update dependencies
cd app
npm install

# Run migrations (if any)
npx prisma migrate deploy

# Rebuild application
npm run build

# Restart service
sudo systemctl restart analytics.service

# Check status
sudo systemctl status analytics.service
```

### Database Backups

```bash
# Backup PostgreSQL
docker exec my-analytics-postgres-1 pg_dump -U postgres my_analytics > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore PostgreSQL
docker exec -i my-analytics-postgres-1 psql -U postgres my_analytics < backup_20241031_120000.sql
```

## Troubleshooting

### Service Won't Start

```bash
# Check service status
sudo systemctl status analytics.service

# View detailed logs
sudo journalctl -u analytics.service -n 100 --no-pager

# Common issues:
# 1. Wrong Node.js version - check service file uses direct node path
# 2. AUTH_URL using HTTP instead of HTTPS
# 3. Database not running - check: docker-compose ps
# 4. Port 3000 already in use - check: sudo lsof -i :3000
```

### 502 Bad Gateway

```bash
# Check if app is running
sudo systemctl status analytics.service
curl http://localhost:3000/api/health

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check app logs
sudo journalctl -u analytics.service -f
```

### 400 Bad Request (No SSL Certificate)

This means Authenticated Origin Pulls is not enabled in Cloudflare:

1. Go to Cloudflare dashboard
2. SSL/TLS → Origin Server
3. Enable "Authenticated Origin Pulls"
4. Wait 30 seconds and test again

### Firewall Blocking Cloudflare

```bash
# Check UFW status
sudo ufw status numbered

# Should have 23 rules (1 SSH + 22 Cloudflare)
# If not, run:
sudo /usr/local/bin/update-cloudflare-ufw.sh
```

### Database Connection Issues

```bash
# Check Docker containers
docker-compose ps

# Check logs
docker-compose logs postgres
docker-compose logs redis

# Restart containers
docker-compose restart

# Check DATABASE_URL in .env
cat /home/$USER/my-analytics/app/.env.production | grep DATABASE_URL
```

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for comprehensive troubleshooting guide.

## File Structure

```
deployment/
├── README.md                           # This file
├── .env.server.example                 # Server environment template
├── nginx/
│   ├── nginx.conf                      # Global nginx configuration
│   └── sites-available/
│       └── analytics.franksblog.nl     # Site-specific configuration
├── systemd/
│   └── analytics.service               # Systemd service file
├── scripts/
│   ├── deploy-all.sh                   # Master deployment script
│   ├── 00-install-dependencies.sh      # Install system dependencies
│   ├── 01-setup-ssl-certificates.sh    # Configure SSL certificates
│   ├── 02-configure-nginx.sh           # Deploy nginx configuration
│   ├── 03-setup-firewall.sh            # Configure UFW firewall
│   ├── 04-setup-systemd.sh             # Set up systemd service
│   ├── 05-verify-deployment.sh         # Verify deployment
│   └── update-cloudflare-ufw.sh        # Update Cloudflare IP ranges
└── docs/
    ├── PREREQUISITES.md                # Detailed prerequisites
    ├── CLOUDFLARE_SETUP.md             # Cloudflare configuration guide
    └── TROUBLESHOOTING.md              # Comprehensive troubleshooting
```

## Security Considerations

1. **Never commit `.env` files** - Always use `.gitignore`
2. **Rotate AUTH_SECRET regularly** - Generate new with `openssl rand -base64 32`
3. **Monitor failed login attempts** - Check application logs
4. **Keep system updated** - Run `apt update && apt upgrade` monthly
5. **Review firewall rules** - Audit UFW rules quarterly
6. **Monitor SSL certificate expiration** - Set calendar reminder for 2039

## Support

- **Documentation**: See `/deployment/docs/` for detailed guides
- **Logs**: `sudo journalctl -u analytics.service -f`
- **Nginx Logs**: `/var/log/nginx/access.log` and `/var/log/nginx/error.log`
- **Issues**: Check [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

## License

See main project LICENSE file.

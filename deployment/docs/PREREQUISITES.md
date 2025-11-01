# Deployment Prerequisites

Complete checklist of prerequisites before deploying the Analytics application.

## Server Requirements

### Operating System
- **Ubuntu 22.04 LTS** or later (recommended)
- Ubuntu 20.04 LTS also supported
- Clean installation preferred (minimal bloat)

### Hardware Specifications

**Minimum Requirements:**
- CPU: 2 cores
- RAM: 2GB
- Storage: 20GB
- Network: 100 Mbps

**Recommended for Production:**
- CPU: 4 cores (for better Turbopack build performance)
- RAM: 4GB (comfortable for Next.js + PostgreSQL + Redis)
- Storage: 50GB SSD (faster database performance)
- Network: 1 Gbps

### Server Access

**SSH Access Required:**
```bash
# Verify you can connect
ssh user@your-server-ip

# Check sudo access
sudo whoami  # Should output: root
```

**Root or Sudo Access:**
- Full sudo privileges required
- Will install system packages (nginx, docker, etc.)
- Will modify firewall rules (UFW)
- Will create systemd services

**User Account:**
- Regular user account (not root) recommended
- User must be in `sudo` group
- Example: `supergoose` (as used in production)

To create user with sudo access:
```bash
# As root or existing sudo user
adduser supergoose
usermod -aG sudo supergoose
```

### Network Requirements

**Open Ports (before deployment):**
- Port 22 (SSH) - must be accessible from your IP
- Port 80 (HTTP) - will redirect to HTTPS
- Port 443 (HTTPS) - primary application port

**After deployment, UFW will restrict:**
- Port 22: Open to all (SSH access)
- Port 80/443: Open ONLY to Cloudflare IP ranges
- All other ports: Blocked

**Firewall Status:**
Check if UFW is currently enabled:
```bash
sudo ufw status
```

If enabled and has custom rules, back them up:
```bash
sudo ufw status numbered > ~/ufw-backup.txt
```

## Domain & DNS

### Domain Requirements

1. **Domain Ownership**
   - You must own or control the domain
   - Can be any TLD (.com, .nl, .dev, etc.)
   - Subdomain supported (e.g., analytics.example.com)

2. **Cloudflare Account**
   - Free Cloudflare account sufficient
   - Domain added to Cloudflare
   - Nameservers pointing to Cloudflare

### Cloudflare Setup

**Verify Cloudflare is active:**

1. Go to https://dash.cloudflare.com
2. Select your domain
3. Check "Status" shows "Active"
4. Verify nameservers match Cloudflare's assigned nameservers

**DNS Configuration:**

Create an A record pointing to your server:

| Type | Name      | Content       | Proxy Status | TTL  |
|------|-----------|---------------|--------------|------|
| A    | analytics | YOUR_SERVER_IP | Proxied (🟠) | Auto |

**Critical: Proxy Status must be "Proxied" (orange cloud)**
- This enables Cloudflare protection
- Required for Authenticated Origin Pulls
- Without proxy, mTLS will fail

**Verify DNS propagation:**
```bash
# Check DNS resolves to Cloudflare IP (not your server IP)
dig analytics.franksblog.nl +short
# Should return Cloudflare IP (e.g., 104.21.x.x or 172.67.x.x)

# If returns your server IP, proxy is not enabled
```

## Cloudflare SSL/TLS Configuration

### Required: Cloudflare Origin CA Certificate

**Generate Origin Server Certificate** (if not done):

1. Go to Cloudflare dashboard → SSL/TLS → Origin Server
2. Click "Create Certificate"
3. Settings:
   - Private key type: RSA (2048)
   - Certificate validity: 15 years
   - Hostnames:
     - `*.franksblog.nl` (wildcard)
     - `franksblog.nl` (root domain)
4. Click "Create"
5. **Save both**:
   - Origin Certificate → Copy to `CLOUDFLARE_ORIGIN_SERVER_CERTIFICATE` in `.env`
   - Private Key → Copy to `CLOUDFLARE_ORIGIN_SERVER_PRIVATE_KEY` in `.env`

**CRITICAL: Never commit these to git!**

### SSL/TLS Mode

Before deployment, configure:
1. Go to SSL/TLS → Overview
2. Set encryption mode to: **Full (strict)**
3. Do NOT use:
   - Flexible (insecure)
   - Full (doesn't validate certificate)
   - Off (completely insecure)

## Local Development Environment

### Required Files

**1. Git Repository Cloned**
```bash
git clone https://github.com/yourusername/my-analytics.git
cd my-analytics
```

**2. `.env` File with Cloudflare Certificates**

Your local `.env` must contain:
```env
CLOUDFLARE_ORIGIN_SERVER_CERTIFICATE="-----BEGIN CERTIFICATE-----
[Your certificate from Cloudflare]
-----END CERTIFICATE-----"

CLOUDFLARE_ORIGIN_SERVER_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
[Your private key from Cloudflare]
-----END PRIVATE KEY-----"
```

**3. Environment Configuration Knowledge**

You'll need to configure:
- Database credentials (PostgreSQL)
- Redis connection string
- NextAuth.js secret and URL
- First user credentials
- MaxMind GeoIP license key (optional)

See `deployment/.env.server.example` for full list.

### Required Tools (Local)

**Git:**
```bash
git --version  # Should be installed
```

**SSH Client:**
```bash
ssh -V  # Should be installed on macOS/Linux
```

**Text Editor:**
- For editing `.env.server` configuration
- nano, vim, VSCode, or any editor

## Server Software (Will Be Installed)

The deployment scripts will install these automatically:

### System Packages
- `nginx` - Web server / reverse proxy
- `curl`, `wget` - Download tools
- `git` - Version control
- `build-essential` - Compilation tools
- `ufw` - Firewall

### Node.js Ecosystem
- NVM (Node Version Manager)
- Node.js v20.10.0
- npm v10.2.3 (bundled with Node)

### Docker
- Docker Engine
- Docker Compose

### Databases (Docker containers)
- PostgreSQL 17.6
- Redis 7.4

**No manual installation needed** - scripts handle everything.

## Cloudflare Account Access

### Required Permissions

You need access to:

1. **SSL/TLS Settings**
   - Create Origin Certificates
   - Enable Authenticated Origin Pulls
   - Configure SSL/TLS mode

2. **DNS Settings**
   - Create/modify A records
   - Enable/disable proxy

3. **Dashboard Access**
   - View analytics
   - Configure security settings

### Cloudflare API (Optional)

Not required for deployment, but useful for automation:
- API Token with Zone:Read and Zone:Edit permissions
- Can automate DNS updates, purge cache, etc.

## Security Prerequisites

### SSH Key Authentication (Recommended)

Password authentication works, but SSH keys are more secure:

```bash
# Generate SSH key (if not exists)
ssh-keygen -t ed25519 -C "your_email@example.com"

# Copy to server
ssh-copy-id user@your-server-ip

# Test key-based login
ssh user@your-server-ip
# Should not prompt for password
```

### Strong Credentials

Prepare strong credentials for:

1. **First User Account** (application admin)
   - Email: Valid email address
   - Password: Minimum 8 characters, complex
   - Name: Display name

2. **Database Password**
   - PostgreSQL password
   - Minimum 16 characters recommended
   - Include uppercase, lowercase, numbers, symbols

3. **AUTH_SECRET** (NextAuth.js)
   - Random 32+ character string
   - Generate with: `openssl rand -base64 32`

**Never use default/weak passwords in production!**

## Knowledge Prerequisites

### Basic Linux Administration

You should be comfortable with:
- SSH connections
- sudo commands
- Basic file operations (cp, mv, chmod, chown)
- Text editing (nano or vim)
- Process management (systemctl)
- Viewing logs (journalctl, tail)

### Basic Nginx Knowledge (Helpful)

Understanding these concepts helps:
- Virtual hosts / server blocks
- Reverse proxy configuration
- SSL/TLS termination
- Log files location

**Not required** - deployment scripts handle configuration.

### Basic Docker Knowledge (Helpful)

Understanding these concepts helps:
- Container lifecycle (up, down, restart, logs)
- docker-compose commands
- Volume persistence

**Not required** - deployment scripts handle Docker.

## Pre-Deployment Checklist

Before starting deployment, verify:

**Server:**
- [ ] Ubuntu 22.04 LTS or later installed
- [ ] SSH access working
- [ ] Sudo access confirmed
- [ ] Server has internet access
- [ ] At least 2GB RAM, 2 CPU cores
- [ ] At least 20GB free disk space

**Domain & Cloudflare:**
- [ ] Domain added to Cloudflare account
- [ ] Cloudflare status is "Active"
- [ ] DNS A record created pointing to server IP
- [ ] DNS record has proxy enabled (orange cloud)
- [ ] Cloudflare SSL/TLS mode set to "Full (strict)"
- [ ] Origin Server certificate generated in Cloudflare
- [ ] Certificate and private key saved to local `.env`

**Local Environment:**
- [ ] Repository cloned locally
- [ ] `.env` file contains Cloudflare certificates
- [ ] Configuration values ready (database credentials, AUTH_SECRET, etc.)
- [ ] SSH connection to server tested

**Credentials Prepared:**
- [ ] First user email, password, name
- [ ] Database password (16+ characters)
- [ ] AUTH_SECRET generated (32+ characters)
- [ ] Redis connection string (if not default)
- [ ] MaxMind license key (optional, for GeoIP)

**Knowledge:**
- [ ] Basic Linux commands understood
- [ ] How to use SSH
- [ ] How to edit files with nano or vim
- [ ] Where to find logs (journalctl, /var/log)

## Estimated Deployment Time

**Automated Deployment:**
- Preparation: 15 minutes
- Execution: 10 minutes
- Cloudflare Configuration: 5 minutes
- Verification: 5 minutes
- **Total: ~35 minutes**

**Manual Deployment:**
- System preparation: 10 minutes
- Software installation: 15 minutes
- Configuration: 20 minutes
- Testing & troubleshooting: 15 minutes
- **Total: ~60 minutes**

Times assume:
- Fast internet connection (download dependencies)
- No major errors encountered
- Familiarity with Linux commands

## Common Pre-Deployment Issues

### Server Access Issues

**Problem:** Can't SSH to server
```bash
# Check if SSH service is running
ssh -v user@server-ip

# Common causes:
# - Firewall blocking port 22
# - SSH service not running
# - Wrong username or password
# - IP address changed
```

**Solution:**
- Use cloud provider's console/VNC access
- Verify SSH service: `sudo systemctl status ssh`
- Check firewall: `sudo ufw status`

### Domain Not Resolving

**Problem:** DNS not pointing to Cloudflare

```bash
dig analytics.franksblog.nl +short
# Returns server IP instead of Cloudflare IP
```

**Solution:**
- Verify nameservers: `dig NS franksblog.nl +short`
- Should return Cloudflare nameservers (e.g., ns1.cloudflare.com)
- If not, update nameservers at domain registrar
- Wait 24-48 hours for propagation

### Missing Cloudflare Certificates

**Problem:** Don't have Origin Server certificate

**Solution:**
1. Go to Cloudflare dashboard
2. SSL/TLS → Origin Server → Create Certificate
3. Copy both certificate and private key
4. Add to local `.env` file
5. Never commit `.env` to git!

### Insufficient Server Resources

**Problem:** Server has < 2GB RAM

**Solution:**
- Upgrade server plan
- Or, disable Redis (use memory cache instead)
- Reduce PostgreSQL shared_buffers
- Not recommended for production

## Need Help?

If you're missing prerequisites or encounter issues:

1. **Documentation:**
   - Read `/deployment/README.md` for deployment guide
   - Check `/deployment/docs/TROUBLESHOOTING.md` for common issues

2. **Test Environment:**
   - Consider testing deployment on a staging server first
   - Use Cloudflare's free plan for testing

3. **Cloudflare Support:**
   - Community: https://community.cloudflare.com
   - Docs: https://developers.cloudflare.com

4. **Server Provider:**
   - Check provider's documentation for server setup
   - Verify firewall rules aren't blocking ports

## Next Steps

Once all prerequisites are met:

1. **Automated:** Follow `/deployment/README.md` → Quick Start
2. **Manual:** Follow `/deployment/README.md` → Manual Deployment
3. **Cloudflare:** Configure using `/deployment/docs/CLOUDFLARE_SETUP.md`

Ready to deploy!

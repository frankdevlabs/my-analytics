# Troubleshooting Guide

Comprehensive troubleshooting guide for common deployment and runtime issues with the Analytics application.

## Table of Contents

1. [Service Issues](#service-issues)
2. [SSL/TLS Errors](#ssltls-errors)
3. [Nginx Errors](#nginx-errors)
4. [Firewall Issues](#firewall-issues)
5. [Database Problems](#database-problems)
6. [Application Errors](#application-errors)
7. [Performance Issues](#performance-issues)
8. [Log Analysis](#log-analysis)

## Service Issues

### Service Won't Start

**Symptoms:**
```bash
sudo systemctl status analytics.service
# Shows: failed (exit-code)
```

**Diagnosis:**
```bash
# View detailed logs
sudo journalctl -u analytics.service -n 100 --no-pager

# Check if port is already in use
sudo lsof -i :3000

# Check Node.js version
sudo -u supergoose bash -c 'export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"; node --version'
```

**Common Causes & Solutions:**

**1. Wrong Node.js Version**
```bash
# Symptom in logs:
# ERROR: npm v10.2.3 is known not to run on Node.js v12.22.9

# Fix: Ensure service uses direct node path
sudo nano /etc/systemd/system/analytics.service

# Change:
ExecStart=/path/to/node /path/to/next start

# NOT:
ExecStart=npm start
```

**2. AUTH_URL Using HTTP Instead of HTTPS**
```bash
# Symptom in logs:
# NextAuth error: Invalid AUTH_URL

# Fix: Update .env
sudo nano /home/supergoose/my-analytics/app/.env

# Change:
AUTH_URL="https://analytics.franksblog.nl"  # NOT http://
```

**3. Database Not Ready**
```bash
# Check PostgreSQL container
docker-compose ps

# If not running:
cd /home/supergoose/my-analytics
docker-compose up -d

# Wait 10 seconds, then restart service
sleep 10
sudo systemctl restart analytics.service
```

**4. Permission Issues**
```bash
# Check service user
grep "User=" /etc/systemd/system/analytics.service

# Ensure files are accessible
sudo ls -la /home/supergoose/my-analytics/app/

# Fix permissions if needed
sudo chown -R supergoose:supergoose /home/supergoose/my-analytics
```

**5. Port Already in Use**
```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill if necessary
sudo kill -9 <PID>

# Or change port in .env
sudo nano /home/supergoose/my-analytics/app/.env
# Add: PORT=3001

# Update nginx proxy_pass accordingly
```

### Service Keeps Restarting

**Diagnosis:**
```bash
# Check restart count
systemctl show analytics.service | grep NRestarts

# View continuous logs
sudo journalctl -u analytics.service -f
```

**Common Causes:**
- Application crash (check logs for errors)
- Memory exhaustion (check: `free -h`)
- Database connection failures
- Environment variable issues

**Fix:**
```bash
# Increase restart delay
sudo nano /etc/systemd/system/analytics.service

# Change:
RestartSec=30s  # Was 10s

sudo systemctl daemon-reload
sudo systemctl restart analytics.service
```

## SSL/TLS Errors

### 400 Bad Request - No Required SSL Certificate

**Error Message:**
```
400 Bad Request
No required SSL certificate was sent
nginx
```

**Cause:** Authenticated Origin Pulls enabled in Cloudflare but request doesn't include client certificate.

**Solutions:**

**1. Enable Authenticated Origin Pulls in Cloudflare**

If deploying for first time:
1. Go to Cloudflare dashboard
2. SSL/TLS → Origin Server
3. Toggle "Authenticated Origin Pulls" to **ON**
4. Wait 30 seconds and test

**2. Verify Nginx Configuration**
```bash
# Check nginx has Cloudflare CA
sudo ls -la /etc/nginx/ssl/cloudflare/origin-pull-ca.pem

# If missing:
sudo curl -o /etc/nginx/ssl/cloudflare/origin-pull-ca.pem \
  https://developers.cloudflare.com/ssl/static/authenticated_origin_pull_ca.pem

# Check nginx config
sudo grep -A 2 "ssl_client_certificate" /etc/nginx/sites-enabled/analytics.franksblog.nl

# Should show:
# ssl_client_certificate /etc/nginx/ssl/cloudflare/origin-pull-ca.pem;
# ssl_verify_client on;
# ssl_verify_depth 1;

# Reload nginx
sudo systemctl reload nginx
```

**3. Test Direct Connection (Should Fail)**
```bash
# This SHOULD fail with 400 error (proof mTLS is working)
curl -k https://YOUR_SERVER_IP

# This SHOULD succeed (through Cloudflare)
curl -I https://analytics.franksblog.nl
```

### 502 Bad Gateway

**Symptoms:** Cloudflare shows "502 Bad Gateway" error

**Diagnosis:**
```bash
# Check application is running
sudo systemctl status analytics.service
curl http://localhost:3000

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check if nginx can reach backend
sudo nginx -t
```

**Common Causes & Solutions:**

**1. Application Not Running**
```bash
sudo systemctl start analytics.service
sudo systemctl status analytics.service
```

**2. Wrong Upstream Port**
```bash
# Verify app port
sudo lsof -i :3000

# Check nginx upstream config
sudo grep "upstream nextjs_backend" -A 2 /etc/nginx/sites-enabled/analytics.franksblog.nl

# Should be:
# upstream nextjs_backend {
#     server localhost:3000;
# }
```

**3. Firewall Blocking Localhost**
```bash
# Check UFW status
sudo ufw status

# Localhost should NOT be blocked (UFW doesn't block localhost by default)
```

### 525 SSL Handshake Failed

**Symptoms:** Cloudflare error 525

**Cause:** Origin certificate invalid or expired

**Fix:**
```bash
# Verify certificate
sudo openssl x509 -in /etc/nginx/ssl/analytics.franksblog.nl.pem -text -noout | grep -E "Not|Subject"

# Check expiration date
sudo openssl x509 -in /etc/nginx/ssl/analytics.franksblog.nl.pem -noout -enddate

# Verify certificate matches key
sudo openssl x509 -noout -modulus -in /etc/nginx/ssl/analytics.franksblog.nl.pem | openssl md5
sudo openssl rsa -noout -modulus -in /etc/nginx/ssl/analytics.franksblog.nl.key | openssl md5

# If they don't match, redeploy certificates:
cd deployment/scripts
sudo bash 01-setup-ssl-certificates.sh
```

## Nginx Errors

### Configuration Test Failed

**Error:**
```bash
sudo nginx -t
# nginx: [emerg] directive is duplicate
```

**Common Issues:**

**1. Duplicate Directives**
```bash
# Find duplicate
sudo grep -n "proxy_http_version" /etc/nginx/sites-enabled/analytics.franksblog.nl

# Remove duplicate lines
sudo nano /etc/nginx/sites-enabled/analytics.franksblog.nl
```

**2. Syntax Errors**
```bash
# Check for missing semicolons
sudo grep -E "[^;]$" /etc/nginx/sites-enabled/analytics.franksblog.nl

# Check for unclosed braces
sudo grep -c "{" /etc/nginx/sites-enabled/analytics.franksblog.nl
sudo grep -c "}" /etc/nginx/sites-enabled/analytics.franksblog.nl
# Counts should match
```

**3. Include File Missing**
```bash
# Check included files exist
sudo ls -la /etc/nginx/mime.types
sudo ls -la /etc/nginx/conf.d/
```

### Nginx Won't Start

**Diagnosis:**
```bash
sudo systemctl status nginx
sudo nginx -t
sudo journalctl -u nginx -n 50
```

**Common Fixes:**

**1. Port Already in Use**
```bash
# Check what's using port 80/443
sudo lsof -i :80
sudo lsof -i :443

# Kill conflicting process or change nginx port
```

**2. Permission Issues**
```bash
# Check SSL certificate permissions
sudo ls -la /etc/nginx/ssl/

# Fix if needed
sudo chmod 644 /etc/nginx/ssl/*.pem
sudo chmod 600 /etc/nginx/ssl/*.key
sudo chown root:root /etc/nginx/ssl/*
```

## Firewall Issues

### Cloudflare Can't Reach Server

**Symptoms:** Site timeout or connection refused

**Diagnosis:**
```bash
# Check UFW status
sudo ufw status numbered

# Should show:
# - 1 rule for SSH (22)
# - 22 rules for Cloudflare (80/443)
```

**Fix:**
```bash
# Update Cloudflare IP ranges
sudo /usr/local/bin/update-cloudflare-ufw.sh

# Verify rules
sudo ufw status | grep Cloudflare | wc -l
# Should show 22
```

### SSH Connection Blocked

**CRITICAL:** Never lock yourself out!

**If you can still connect:**
```bash
# Ensure SSH is allowed
sudo ufw allow 22/tcp
sudo ufw reload
```

**If locked out:**
- Use cloud provider's console/VNC to access server
- Disable UFW: `sudo ufw disable`
- Add SSH rule: `sudo ufw allow 22/tcp`
- Re-enable: `sudo ufw enable`

### Direct IP Access Works, Domain Doesn't

**Diagnosis:**
```bash
# Test direct IP (should fail with 400)
curl -k https://YOUR_SERVER_IP

# Test domain (should work)
curl -I https://analytics.franksblog.nl

# Check DNS
dig analytics.franksblog.nl +short
# Should return Cloudflare IP, not your server IP
```

**Fix:**
- If returns server IP: Enable proxy in Cloudflare DNS (orange cloud)
- If returns nothing: Add A record in Cloudflare

## Database Problems

### Can't Connect to PostgreSQL

**Diagnosis:**
```bash
# Check container status
docker-compose ps

# Check logs
docker-compose logs postgres

# Test connection
docker exec -it my-analytics-postgres-1 psql -U postgres -d my_analytics -c "SELECT 1"
```

**Common Fixes:**

**1. Container Not Running**
```bash
cd /home/supergoose/my-analytics
docker-compose up -d
docker-compose ps
```

**2. Wrong DATABASE_URL**
```bash
# Check .env
cat /home/supergoose/my-analytics/app/.env | grep DATABASE_URL

# Should be:
# DATABASE_URL="postgresql://postgres:PASSWORD@localhost:5432/my_analytics"

# Restart app after fixing
sudo systemctl restart analytics.service
```

**3. Port Conflict**
```bash
# Check if another process uses 5432
sudo lsof -i :5432

# Change PostgreSQL port if needed
nano docker-compose.yml
# Change: "5433:5432"  # Maps container port 5432 to host 5433

# Update DATABASE_URL accordingly
```

### Database Migrations Failed

**Diagnosis:**
```bash
cd /home/supergoose/my-analytics/app
npm run prisma:migrate:status
```

**Fix:**
```bash
# Run migrations
npx prisma migrate deploy

# If fails, reset (WARNING: deletes data)
npx prisma migrate reset

# Recreate first user
npm run create-user
```

## Application Errors

### TypeError: Cannot read property of undefined

**Check:**
1. Environment variables loaded correctly
2. Database connection working
3. Required dependencies installed

**Fix:**
```bash
# Reinstall dependencies
cd /home/supergoose/my-analytics/app
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build

# Restart
sudo systemctl restart analytics.service
```

### Memory Exhaustion

**Symptoms:**
- OOM (Out of Memory) errors
- Service crashes randomly
- Slow performance

**Diagnosis:**
```bash
# Check memory usage
free -h
docker stats

# Check swap
swapon --show
```

**Fix:**
```bash
# Add swap (if none)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Or upgrade server RAM
```

## Performance Issues

### Slow Page Loads

**Diagnosis:**
```bash
# Check nginx response time
curl -o /dev/null -s -w "Time: %{time_total}s\n" https://analytics.franksblog.nl

# Check application response
curl -o /dev/null -s -w "Time: %{time_total}s\n" http://localhost:3000

# Check database performance
docker exec my-analytics-postgres-1 psql -U postgres -d my_analytics -c "SELECT pg_stat_statements_reset();"
```

**Optimizations:**

**1. Enable Redis Caching**
```bash
# Verify Redis running
docker-compose ps | grep redis

# Check REDIS_URL in .env
cat /home/supergoose/my-analytics/app/.env | grep REDIS_URL
```

**2. Optimize PostgreSQL**
```bash
# Edit docker-compose.yml
nano docker-compose.yml

# Add under postgres environment:
POSTGRES_SHARED_BUFFERS: 256MB
POSTGRES_EFFECTIVE_CACHE_SIZE: 1GB
POSTGRES_MAX_CONNECTIONS: 100

# Restart
docker-compose restart postgres
```

**3. Check Nginx Cache**
```bash
# Verify caching headers
curl -I https://analytics.franksblog.nl/_next/static/

# Should see: Cache-Control: public, max-age=31536000
```

## Log Analysis

### View Application Logs

```bash
# Real-time logs
sudo journalctl -u analytics.service -f

# Last 100 lines
sudo journalctl -u analytics.service -n 100 --no-pager

# Since specific time
sudo journalctl -u analytics.service --since "1 hour ago"

# Filter by priority
sudo journalctl -u analytics.service -p err  # Errors only
```

### View Nginx Logs

```bash
# Access log (requests)
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/analytics.access.log

# Error log
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/analytics.error.log

# Search for errors
sudo grep "error" /var/log/nginx/error.log | tail -20
```

### View Docker Logs

```bash
# All containers
docker-compose logs -f

# Specific container
docker-compose logs -f postgres
docker-compose logs -f redis

# Last 50 lines
docker-compose logs --tail=50 postgres
```

## Getting Help

If issues persist:

1. **Check Documentation**
   - Main guide: `/deployment/README.md`
   - Prerequisites: `/deployment/docs/PREREQUISITES.md`
   - Cloudflare: `/deployment/docs/CLOUDFLARE_SETUP.md`

2. **Gather Information**
   ```bash
   # System info
   uname -a
   cat /etc/os-release

   # Service status
   sudo systemctl status analytics.service nginx docker

   # Recent errors
   sudo journalctl -p err --since "1 hour ago" --no-pager

   # Network status
   sudo ss -tlnp | grep -E ":(22|80|443|3000|5432|6379)"
   ```

3. **Create Issue Report**
   Include:
   - Error message (exact text)
   - Steps to reproduce
   - System information
   - Relevant logs
   - What you've tried

4. **Community Resources**
   - Next.js Docs: https://nextjs.org/docs
   - Cloudflare Community: https://community.cloudflare.com
   - Nginx Docs: https://nginx.org/en/docs/

# Cloudflare Configuration Guide

Complete guide for configuring Cloudflare to work with the Analytics application using Authenticated Origin Pulls (mTLS) and optimal security settings.

## Table of Contents

1. [Overview](#overview)
2. [DNS Configuration](#dns-configuration)
3. [SSL/TLS Settings](#ssltls-settings)
4. [Origin Server Certificate](#origin-server-certificate)
5. [Authenticated Origin Pulls](#authenticated-origin-pulls)
6. [Security Settings](#security-settings)
7. [Performance Settings](#performance-settings)
8. [Verification](#verification)

## Overview

### What We're Configuring

1. **DNS**: Point domain to server with proxy enabled
2. **SSL/TLS Mode**: Full (strict) encryption
3. **Origin Certificate**: Self-signed certificate for origin server
4. **Authenticated Origin Pulls**: Mutual TLS (mTLS) to verify requests come from Cloudflare
5. **Security Headers**: Already configured in nginx (Cloudflare respects them)
6. **Performance**: Caching, minification, HTTP/2, HTTP/3

### Security Model

```
Client
  ↓ (HTTPS - Cloudflare cert)
Cloudflare Edge
  ↓ (HTTPS + mTLS - Origin cert)
Your Server (Nginx)
  ↓ (HTTP - localhost)
Next.js App
```

## DNS Configuration

### Step 1: Add Domain to Cloudflare

If not already done:

1. Go to https://dash.cloudflare.com
2. Click "Add a Site"
3. Enter your domain: `franksblog.nl`
4. Select plan (Free is sufficient)
5. Click "Add Site"
6. Cloudflare will scan existing DNS records
7. Review and confirm records
8. Click "Continue"

### Step 2: Update Nameservers

Cloudflare will provide two nameservers:

```
ns1.cloudflare.com
ns2.cloudflare.com
```

Or similar (specific to your account).

**At your domain registrar:**
1. Log in to domain registrar
2. Find DNS/Nameserver settings
3. Change nameservers to Cloudflare's nameservers
4. Save changes
5. Wait 24-48 hours for propagation (usually faster)

**Verify nameserver change:**
```bash
dig NS franksblog.nl +short
# Should show Cloudflare nameservers
```

### Step 3: Create A Record

In Cloudflare dashboard → DNS → Records:

1. Click "Add record"
2. Configure:
   - **Type**: A
   - **Name**: analytics (or your subdomain)
   - **IPv4 address**: YOUR_SERVER_IP
   - **Proxy status**: Proxied (🟠 orange cloud) ← **CRITICAL**
   - **TTL**: Auto
3. Click "Save"

**Example:**
| Type | Name      | Content        | Proxy Status | TTL  |
|------|-----------|----------------|--------------|------|
| A    | analytics | 198.51.100.50  | Proxied (🟠)  | Auto |

**IMPORTANT: Proxy must be enabled (orange cloud)**
- Without proxy, your server IP is exposed
- Authenticated Origin Pulls won't work
- No DDoS protection or caching

**Verify DNS:**
```bash
dig analytics.franksblog.nl +short
# Should return Cloudflare IP (e.g., 104.21.x.x)
# NOT your server IP

ping analytics.franksblog.nl
# Should ping Cloudflare IP, not server IP
```

### Step 4: Add AAAA Record (IPv6) - Optional

If your server has IPv6:

1. Click "Add record"
2. Configure:
   - **Type**: AAAA
   - **Name**: analytics
   - **IPv6 address**: YOUR_IPV6_ADDRESS
   - **Proxy status**: Proxied (🟠)
   - **TTL**: Auto
3. Click "Save"

## SSL/TLS Settings

### Step 1: Set Encryption Mode

Go to SSL/TLS → Overview:

1. Select **"Full (strict)"**
2. Do NOT use:
   - ❌ Off (no encryption)
   - ❌ Flexible (insecure - encrypts only client to Cloudflare)
   - ❌ Full (doesn't validate origin certificate)

**Why Full (strict)?**
- Encrypts end-to-end (client → Cloudflare → server)
- Validates origin certificate against trusted CA
- Prevents man-in-the-middle attacks
- Required for Authenticated Origin Pulls

### Step 2: Enable Always Use HTTPS

Go to SSL/TLS → Edge Certificates:

1. Scroll to "Always Use HTTPS"
2. Toggle **ON**
3. This redirects all HTTP requests to HTTPS

**Note:** Nginx also has HTTP → HTTPS redirect as backup.

### Step 3: Enable HSTS (Optional but Recommended)

Still in SSL/TLS → Edge Certificates:

1. Scroll to "HTTP Strict Transport Security (HSTS)"
2. Click "Enable HSTS"
3. Configure:
   - **Status**: On
   - **Max Age Header**: 6 months (15768000 seconds)
   - **Include subdomains**: On (if all subdomains use HTTPS)
   - **Preload**: On (if you want to submit to HSTS preload list)
4. Click "Save"

**⚠️ Warning:** HSTS preload is permanent and affects all subdomains. Only enable if certain.

### Step 4: Minimum TLS Version

Still in SSL/TLS → Edge Certificates:

1. Scroll to "Minimum TLS Version"
2. Select **TLS 1.2** or **TLS 1.3**
3. Matches nginx configuration (TLS 1.2 and 1.3 only)

## Origin Server Certificate

### Step 1: Generate Origin Certificate

Go to SSL/TLS → Origin Server:

1. Click "Create Certificate"
2. Configure:
   - **Let Cloudflare generate a private key and a CSR**: Select (default)
   - **Private key type**: RSA (2048) ← Use this
   - **Certificate Validity**: 15 years (max duration)
   - **Hostnames**:
     ```
     *.franksblog.nl
     franksblog.nl
     ```
     This covers all subdomains + root domain
3. Click "Create"

### Step 2: Save Certificate and Private Key

Cloudflare will show two text boxes:

**Origin Certificate:**
```
-----BEGIN CERTIFICATE-----
MIIEpjCCA46gAwIBAgIUJmn...
[many lines]
...vHZQqLWs=
-----END CERTIFICATE-----
```

**Private Key:**
```
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0...
[many lines]
...Qq0dKXCZA==
-----END PRIVATE KEY-----
```

**Save to local `.env` file:**

Open `/Users/frankdevlab/WebstormProjects/my-analytics/.env` and add:

```env
CLOUDFLARE_ORIGIN_SERVER_CERTIFICATE="-----BEGIN CERTIFICATE-----
[Paste entire certificate here - keep newlines]
-----END CERTIFICATE-----"

CLOUDFLARE_ORIGIN_SERVER_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
[Paste entire private key here - keep newlines]
-----END PRIVATE KEY-----"
```

**CRITICAL SECURITY:**
- Never commit `.env` to git
- Keep private key secret
- These credentials are used by deployment scripts

### Step 3: Click OK

After saving locally:
1. Click "OK" in Cloudflare
2. Certificate is now listed in "Origin Certificates"
3. Expires in 15 years (October 2040)

**Certificate details:**
- Serial number shown
- Status: Active
- Expires: [Date 15 years from now]

**Can't access certificate again** - Cloudflare only shows it once. If lost, create a new certificate and update `.env`.

## Authenticated Origin Pulls

This is the most critical security feature - ensures only Cloudflare can connect to your origin server.

### Step 1: Enable Authenticated Origin Pulls

Still in SSL/TLS → Origin Server:

1. Scroll to "Authenticated Origin Pulls"
2. Toggle to **ON**
3. Status should show: "Authenticated Origin Pulls is on"

**What this does:**
- Cloudflare sends a client certificate with every request
- Nginx validates this certificate (configured in nginx config)
- Requests without valid Cloudflare certificate are rejected (400 error)
- Prevents direct attacks on your server IP

### Step 2: Verify in Nginx Config

Your nginx configuration already includes (configured by deployment scripts):

```nginx
# /etc/nginx/sites-available/analytics.franksblog.nl

ssl_client_certificate /etc/nginx/ssl/cloudflare/origin-pull-ca.pem;
ssl_verify_client on;
ssl_verify_depth 1;
```

This tells nginx to:
- Require client certificate
- Verify against Cloudflare CA
- Only accept depth 1 (direct signature)

**Cloudflare CA certificate** is downloaded during deployment from:
```
https://developers.cloudflare.com/ssl/static/authenticated_origin_pull_ca.pem
```

### Step 3: Test Authenticated Origin Pulls

**Test 1: Direct connection should fail**
```bash
# Try connecting directly to server IP (bypassing Cloudflare)
curl -k https://YOUR_SERVER_IP

# Expected result:
# 400 Bad Request
# "No required SSL certificate was sent"
```

This proves mTLS is working - requests without Cloudflare's client certificate are rejected.

**Test 2: Cloudflare proxy should work**
```bash
# Connect through Cloudflare
curl -I https://analytics.franksblog.nl

# Expected result:
# HTTP/2 200 OK
# [Security headers listed]
```

This proves Cloudflare is successfully presenting its client certificate.

**⚠️ If Test 2 returns 400 error:**
- Authenticated Origin Pulls may not be enabled in Cloudflare
- Or nginx config missing Cloudflare CA certificate
- See Troubleshooting section

## Security Settings

### Step 1: Configure Security Level

Go to Security → Settings:

1. **Security Level**: Medium (recommended)
   - Low: Only challenges very threatening visitors
   - Medium: Balance between security and user experience
   - High: More aggressive, may challenge legitimate users
   - I'm Under Attack: Maximum protection (use during DDoS)

### Step 2: Enable Bot Fight Mode (Free Plan)

Go to Security → Bots:

1. Toggle "Bot Fight Mode" **ON**
2. Challenges/blocks automated traffic
3. Allows good bots (Google, Bing crawlers)

**Note:** Paid plans have more sophisticated bot management.

### Step 3: Configure Challenge Passage

Go to Security → Settings:

1. **Challenge Passage**: 30 minutes (default)
   - How long a solved challenge remains valid
   - Shorter = more security, more friction
   - Longer = better UX, less security

### Step 4: Browser Integrity Check

Go to Security → Settings:

1. Toggle "Browser Integrity Check" **ON**
2. Blocks common threats from bots
3. Checks for HTTP headers often abused by spammers

## Performance Settings

### Step 1: Enable Auto Minify

Go to Speed → Optimization:

1. Scroll to "Auto Minify"
2. Enable:
   - ✅ JavaScript
   - ✅ CSS
   - ✅ HTML
3. Reduces file sizes by removing whitespace/comments

### Step 2: Enable Brotli Compression

Still in Speed → Optimization:

1. Toggle "Brotli" **ON**
2. Better compression than gzip (20-30% smaller)
3. Supported by all modern browsers

**Note:** Nginx gzip is still enabled as fallback.

### Step 3: Enable HTTP/2 and HTTP/3

Go to Network:

1. **HTTP/2**: Should be ON (default)
2. **HTTP/3 (with QUIC)**: Toggle **ON**
   - Faster connection establishment
   - Better performance on mobile/unreliable networks
   - Gradually rolling out to browsers

### Step 4: Configure Caching

Go to Caching → Configuration:

**Caching Level:**
- Select **Standard** (default)
- Caches static resources
- Respects cache headers from origin

**Browser Cache TTL:**
- Select **4 hours** or **Respect Existing Headers** (recommended)
- Lets nginx control cache duration via headers

**Always Online:**
- Toggle **ON** (optional)
- Serves cached version if origin is down

### Step 5: Page Rules (Optional)

If you want custom caching for specific paths:

Go to Rules → Page Rules:

**Example: Cache API responses**
```
URL pattern: analytics.franksblog.nl/api/stats*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 5 minutes
```

**Example: Bypass cache for admin**
```
URL pattern: analytics.franksblog.nl/login
Settings:
  - Cache Level: Bypass
```

Free plan allows 3 page rules.

## Verification

### Complete Checklist

After configuration, verify:

**DNS:**
```bash
dig analytics.franksblog.nl +short
# Returns Cloudflare IP (104.x.x.x or 172.x.x.x)

whois analytics.franksblog.nl
# Shows Cloudflare as nameserver
```

**SSL/TLS:**
```bash
curl -I https://analytics.franksblog.nl

# Check for:
# HTTP/2 200
# strict-transport-security header
# x-frame-options header
# (All security headers)
```

**Origin Pulls:**
```bash
# Should fail (no client cert)
curl -k https://YOUR_SERVER_IP
# Expected: 400 Bad Request

# Should succeed (through Cloudflare)
curl -I https://analytics.franksblog.nl
# Expected: 200 OK
```

**Application:**
```bash
# Test application loads
curl https://analytics.franksblog.nl
# Should return HTML

# Test login page
curl https://analytics.franksblog.nl/login
# Should return login page HTML
```

### SSL Labs Test (Optional)

For comprehensive SSL/TLS analysis:

1. Go to https://www.ssllabs.com/ssltest/
2. Enter: `analytics.franksblog.nl`
3. Click "Submit"
4. Wait 2-3 minutes for analysis
5. Expected grade: **A** or **A+**

**Possible issues:**
- If grade lower than A, check:
  - TLS version (should be 1.2+ only)
  - Cipher suites
  - Certificate chain

### Security Headers Test

Check security headers:

1. Go to https://securityheaders.com
2. Enter: `https://analytics.franksblog.nl`
3. Click "Scan"
4. Expected grade: **A** or **A+**

**Headers configured in nginx:**
- Strict-Transport-Security
- X-Frame-Options
- X-Content-Type-Options
- Content-Security-Policy
- Referrer-Policy
- Permissions-Policy

### Cloudflare Analytics

Monitor traffic in Cloudflare dashboard:

Go to Analytics & Logs → Traffic:
- Requests over time
- Bandwidth usage
- Threats blocked
- Top requests

Initially will show low traffic. Check after few hours of operation.

## Troubleshooting

### DNS Not Resolving to Cloudflare

**Problem:**
```bash
dig analytics.franksblog.nl +short
# Returns server IP instead of Cloudflare IP
```

**Solution:**
1. Check proxy is enabled (orange cloud) in DNS settings
2. If recently changed, wait 5 minutes for propagation
3. Clear local DNS cache: `sudo dscacheutil -flushcache` (macOS) or `sudo systemd-resolve --flush-caches` (Linux)

### 400 Bad Request After Enabling Origin Pulls

**Problem:** Site shows "400 Bad Request: No required SSL certificate was sent"

**Causes:**
1. Authenticated Origin Pulls enabled in Cloudflare but NOT deployed to nginx yet
2. Cloudflare CA certificate missing on server

**Solution:**
1. If deploying for first time: This is expected until nginx is configured
2. If already deployed: Check nginx config has:
   ```nginx
   ssl_client_certificate /etc/nginx/ssl/cloudflare/origin-pull-ca.pem;
   ssl_verify_client on;
   ```
3. Verify CA cert exists:
   ```bash
   ls -la /etc/nginx/ssl/cloudflare/origin-pull-ca.pem
   ```
4. If missing, download:
   ```bash
   sudo curl -o /etc/nginx/ssl/cloudflare/origin-pull-ca.pem \
     https://developers.cloudflare.com/ssl/static/authenticated_origin_pull_ca.pem
   sudo systemctl reload nginx
   ```

### Mixed Content Warnings

**Problem:** Browser console shows mixed content errors

**Cause:** Page loaded over HTTPS references HTTP resources

**Solution:**
1. Ensure all resources use HTTPS or protocol-relative URLs (`//example.com/script.js`)
2. Check Cloudflare → SSL/TLS → Edge Certificates → "Automatic HTTPS Rewrites" is ON

### Certificate Mismatch Errors

**Problem:** Browser shows certificate error

**Causes:**
1. SSL/TLS mode set to "Flexible" or "Off"
2. Origin certificate not installed on server
3. Origin certificate expired

**Solution:**
1. Check SSL/TLS mode is "Full (strict)"
2. Verify origin certificate installed:
   ```bash
   sudo openssl x509 -in /etc/nginx/ssl/analytics.franksblog.nl.pem -text -noout
   ```
3. Check expiration date (should be ~2040)

### Site Not Loading

**Problem:** Site doesn't load or shows Cloudflare error

**Cause:** Origin server not responding

**Solution:**
1. Check server is running:
   ```bash
   sudo systemctl status analytics.service
   ```
2. Check nginx is running:
   ```bash
   sudo systemctl status nginx
   ```
3. Check port 3000 is listening:
   ```bash
   sudo lsof -i :3000
   ```
4. Check nginx error logs:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

## Advanced Configuration

### Custom SSL Certificates (Not Recommended)

If you want to use Let's Encrypt instead of Cloudflare Origin CA:

**Why not recommended:**
- Cloudflare Origin CA is simpler
- No renewal needed (15 years validity)
- No rate limits

**If you insist:**
1. Disable Authenticated Origin Pulls (less secure)
2. Install certbot on server
3. Get Let's Encrypt certificate
4. Update nginx to use Let's Encrypt cert
5. Configure auto-renewal

Not covered in this guide.

### Per-Hostname Authenticated Origin Pulls

For multiple subdomains with different certificates:

1. Upload custom client certificate in Cloudflare
2. Configure nginx with per-hostname ssl_client_certificate
3. Complex setup - not needed for single subdomain

### Rate Limiting

Cloudflare rate limiting (paid feature):

- Blocks excessive requests from single IP
- Complements nginx rate limiting
- More sophisticated than nginx (global, not per-server)

**Free plan:** Use nginx rate limiting (already configured).

## Summary

After completing this guide, you should have:

1. ✅ DNS pointing to Cloudflare (proxied)
2. ✅ SSL/TLS mode: Full (strict)
3. ✅ Origin Server certificate created and saved
4. ✅ Authenticated Origin Pulls enabled
5. ✅ Security settings configured
6. ✅ Performance optimizations enabled
7. ✅ All verification tests passing

Your application is now:
- Protected by Cloudflare's global network
- Secured with end-to-end encryption + mTLS
- Optimized for performance (caching, compression, HTTP/2, HTTP/3)
- Hardened against DDoS, bots, and attacks

**Next Steps:**
1. Monitor Cloudflare Analytics for traffic patterns
2. Review Security Events for blocked threats
3. Update Cloudflare IP ranges monthly (see Maintenance in main README)
4. Consider upgrading to Pro plan for advanced features (optional)

**Support:**
- Cloudflare Community: https://community.cloudflare.com
- Cloudflare Docs: https://developers.cloudflare.com
- SSL/TLS Docs: https://developers.cloudflare.com/ssl

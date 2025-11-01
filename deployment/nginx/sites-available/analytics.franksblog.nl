# Upstream configuration for Next.js application
upstream nextjs_backend {
    server localhost:3000;
    keepalive 64;
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
limit_conn_zone $binary_remote_addr zone=addr:10m;

# HTTP server - redirect all traffic to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name analytics.franksblog.nl;

    # Redirect all HTTP requests to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server - main application
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name analytics.franksblog.nl;

    # SSL/TLS Configuration
    ssl_certificate /etc/nginx/ssl/analytics.franksblog.nl.pem;
    ssl_certificate_key /etc/nginx/ssl/analytics.franksblog.nl.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers off;

    # SSL Session
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # OCSP Stapling (optional - may show warning with Cloudflare Origin CA)
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 1.1.1.1 1.0.0.1 valid=300s;
    resolver_timeout 5s;

    # Authenticated Origin Pulls (mTLS)
    # Only accept connections from Cloudflare with valid client certificate
    ssl_client_certificate /etc/nginx/ssl/cloudflare/origin-pull-ca.pem;
    ssl_verify_client on;
    ssl_verify_depth 1;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    add_header Content-Security-Policy "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'self';" always;

    # Rate Limiting
    limit_req zone=general burst=20 nodelay;
    limit_conn addr 10;

    # Cloudflare IP Ranges - Trust only Cloudflare IPs for real client IP restoration
    # IPv4 ranges
    set_real_ip_from 173.245.48.0/20;
    set_real_ip_from 103.21.244.0/22;
    set_real_ip_from 103.22.200.0/22;
    set_real_ip_from 103.31.4.0/22;
    set_real_ip_from 141.101.64.0/18;
    set_real_ip_from 108.162.192.0/18;
    set_real_ip_from 190.93.240.0/20;
    set_real_ip_from 188.114.96.0/20;
    set_real_ip_from 197.234.240.0/22;
    set_real_ip_from 198.41.128.0/17;
    set_real_ip_from 162.158.0.0/15;
    set_real_ip_from 104.16.0.0/13;
    set_real_ip_from 104.24.0.0/14;
    set_real_ip_from 172.64.0.0/13;
    set_real_ip_from 131.0.72.0/22;

    # IPv6 ranges
    set_real_ip_from 2400:cb00::/32;
    set_real_ip_from 2606:4700::/32;
    set_real_ip_from 2803:f800::/32;
    set_real_ip_from 2405:b500::/32;
    set_real_ip_from 2405:8100::/32;
    set_real_ip_from 2a06:98c0::/29;
    set_real_ip_from 2c0f:f248::/32;

    # Use CF-Connecting-IP header for real client IP
    real_ip_header CF-Connecting-IP;
    real_ip_recursive off;

    # Access and error logs
    access_log /var/log/nginx/analytics.access.log;
    error_log /var/log/nginx/analytics.error.log;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/atom+xml image/svg+xml;

    # Main location - proxy to Next.js
    location / {
        # Rate limiting for general requests
        limit_req zone=general burst=20 nodelay;

        # Proxy headers
        proxy_pass http://nextjs_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;

        # Proxy timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Proxy buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;

        # Disable cache for HTML (let Cloudflare handle)
        proxy_cache_bypass $http_upgrade;
        proxy_no_cache $http_upgrade;
    }

    # API routes - higher rate limit
    location /api/ {
        limit_req zone=api burst=50 nodelay;

        proxy_pass http://nextjs_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;

        # Never cache API responses
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
        expires off;
    }

    # Static files - aggressive caching
    location /_next/static/ {
        proxy_pass http://nextjs_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;

        # Cache static assets for 1 year (Next.js uses content hashing)
        add_header Cache-Control "public, max-age=31536000, immutable";
        expires 1y;

        # CORS for static assets if needed
        add_header Access-Control-Allow-Origin "*";
    }

    # Public files
    location /public/ {
        proxy_pass http://nextjs_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;

        add_header Cache-Control "public, max-age=86400";
        expires 1d;
    }

    # Tracker script - cache but revalidate
    location = /tracker.js {
        proxy_pass http://nextjs_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;

        add_header Cache-Control "public, max-age=3600, must-revalidate";
        expires 1h;
    }

    # Health check endpoint (no rate limit)
    location = /api/health {
        proxy_pass http://nextjs_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;

        access_log off;
    }

    # Favicon
    location = /favicon.ico {
        proxy_pass http://nextjs_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;

        add_header Cache-Control "public, max-age=86400";
        expires 1d;
        access_log off;
    }

    # Robots.txt
    location = /robots.txt {
        proxy_pass http://nextjs_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;

        add_header Cache-Control "public, max-age=86400";
        expires 1d;
        access_log off;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}

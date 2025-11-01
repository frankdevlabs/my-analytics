#!/bin/bash
# Cloudflare UFW Updater Script
# Updates UFW rules to only allow Cloudflare IPs

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "Updating Cloudflare IPs in UFW..."

# IPv4 addresses
CF_IPV4=(
    173.245.48.0/20
    103.21.244.0/22
    103.22.200.0/22
    103.31.4.0/22
    141.101.64.0/18
    108.162.192.0/18
    190.93.240.0/20
    188.114.96.0/20
    197.234.240.0/22
    198.41.128.0/17
    162.158.0.0/15
    104.16.0.0/13
    104.24.0.0/14
    172.64.0.0/13
    131.0.72.0/22
)

# IPv6 addresses
CF_IPV6=(
    2400:cb00::/32
    2606:4700::/32
    2803:f800::/32
    2405:b500::/32
    2405:8100::/32
    2a06:98c0::/29
    2c0f:f248::/32
)

# Remove old Cloudflare rules (IPv4)
echo "Removing old Cloudflare IPv4 rules..."
for ip in "${CF_IPV4[@]}"; do
    ufw --force delete allow from "$ip" to any port 80,443 proto tcp comment 'Cloudflare' 2>/dev/null
done

# Remove old Cloudflare rules (IPv6)
echo "Removing old Cloudflare IPv6 rules..."
for ip in "${CF_IPV6[@]}"; do
    ufw --force delete allow from "$ip" to any port 80,443 proto tcp comment 'Cloudflare' 2>/dev/null
done

# Add IPv4 rules
echo "Adding IPv4 rules..."
for ip in "${CF_IPV4[@]}"; do
    ufw allow from "$ip" to any port 80,443 proto tcp comment 'Cloudflare'
    echo -e "${GREEN}✓${NC} Added: $ip"
done

# Add IPv6 rules
echo "Adding IPv6 rules..."
for ip in "${CF_IPV6[@]}"; do
    ufw allow from "$ip" to any port 80,443 proto tcp comment 'Cloudflare'
    echo -e "${GREEN}✓${NC} Added: $ip"
done

echo -e "\n${GREEN}Cloudflare UFW rules updated successfully!${NC}"
echo -e "\nCurrent UFW status:"
ufw status numbered | head -30

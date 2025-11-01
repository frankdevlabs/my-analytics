# CI/CD Pipeline Setup Guide

Complete walkthrough for setting up GitHub Actions CI/CD pipeline for the first time.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [GitHub Secrets Configuration](#github-secrets-configuration)
3. [SSH Key Setup](#ssh-key-setup)
4. [Server Preparation](#server-preparation)
5. [First Deployment Walkthrough](#first-deployment-walkthrough)
6. [Verification Checklist](#verification-checklist)
7. [Troubleshooting Initial Setup](#troubleshooting-initial-setup)

---

## Prerequisites

Before starting, ensure you have:

- [x] GitHub repository for the project
- [x] Production server accessible via SSH
- [x] Admin access to GitHub repository (Settings)
- [x] SSH access to production server
- [x] Production server running:
  - Node.js v20.10.0 (via nvm)
  - PostgreSQL (Docker)
  - Redis (Docker)
  - systemd service configured
  - Nginx configured

---

## GitHub Secrets Configuration

GitHub Secrets store sensitive information securely for use in workflows.

### Required Secrets

You need to configure **3 secrets**:

1. `SSH_PRIVATE_KEY` - SSH private key for server access
2. `SSH_USER` - Username on server (supergoose)
3. `SERVER_IP` - Server IP address (95.111.243.79)

### How to Add Secrets

1. Go to your GitHub repository
2. Click **Settings** tab
3. In left sidebar, expand **Secrets and variables**
4. Click **Actions**
5. Click **New repository secret**
6. Enter **Name** and **Secret** value
7. Click **Add secret**

### Secret Values

#### 1. SSH_USER

```
Name: SSH_USER
Secret: supergoose
```

#### 2. SERVER_IP

```
Name: SERVER_IP
Secret: 95.111.243.79
```

#### 3. SSH_PRIVATE_KEY

See next section for generating/obtaining this value.

---

## SSH Key Setup

You have two options for SSH keys:

### Option 1: Use Existing Key (Quick but Less Secure)

**If you already have SSH access to the server:**

```bash
# Copy your existing private key
cat ~/.ssh/id_rsa

# Or copy to clipboard (macOS)
cat ~/.ssh/id_rsa | pbcopy

# Or copy to clipboard (Linux)
cat ~/.ssh/id_rsa | xclip -selection clipboard
```

Then:
1. Go to GitHub repository → Settings → Secrets → Actions
2. Click "New repository secret"
3. Name: `SSH_PRIVATE_KEY`
4. Secret: Paste the entire key (including `-----BEGIN` and `-----END` lines)
5. Click "Add secret"

**Note**: This uses your personal key. For better security, use Option 2.

---

### Option 2: Generate Dedicated Key (Recommended)

**Generate a new key specifically for GitHub Actions:**

```bash
# Generate new SSH key (no passphrase - GitHub Actions can't enter passwords)
ssh-keygen -t ed25519 -C "github-actions@my-analytics" -f ~/.ssh/github-actions-deploy

# Press Enter when asked for passphrase (leave empty)
```

**Copy private key to GitHub:**

```bash
# macOS
cat ~/.ssh/github-actions-deploy | pbcopy

# Linux
cat ~/.ssh/github-actions-deploy | xclip -selection clipboard
```

Then add to GitHub Secrets:
1. Go to repository → Settings → Secrets → Actions
2. Name: `SSH_PRIVATE_KEY`
3. Secret: Paste the private key
4. Click "Add secret"

**Add public key to server:**

```bash
# Copy public key
cat ~/.ssh/github-actions-deploy.pub

# SSH to server
ssh -i ~/.ssh/id_rsa supergoose@95.111.243.79

# Add to authorized_keys
echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys

# Verify permissions
chmod 600 ~/.ssh/authorized_keys
```

**Test the new key:**

```bash
# From your local machine
ssh -i ~/.ssh/github-actions-deploy supergoose@95.111.243.79

# Should connect without password prompt
```

---

## Server Preparation

Verify the server is ready for automated deployments.

### 1. Verify systemd Service

```bash
# SSH to server
ssh -i ~/.ssh/id_rsa supergoose@95.111.243.79

# Check service exists
systemctl list-unit-files | grep analytics

# Expected output:
# analytics.service    enabled

# Check service status
sudo systemctl status analytics.service

# Should show: "active (running)"
```

If service doesn't exist, see `deployment/README.md` for setup instructions.

---

### 2. Verify Git Repository

```bash
# Check git repo exists
cd /home/supergoose/my-analytics
ls -la .git

# Check remote URL
git remote -v

# Should show:
# origin  https://github.com/frankdevlabs/my-analytics.git (fetch)
# origin  https://github.com/frankdevlabs/my-analytics.git (push)

# Check current branch
git branch

# Should show: * main
```

---

### 3. Verify Docker Containers

```bash
# Check PostgreSQL and Redis running
docker ps

# Should show:
# my-analytics-postgres  Up XX hours  5432/tcp
# my-analytics-redis     Up XX hours  6379/tcp
```

---

### 4. Verify Node.js Version

```bash
# Load NVM
source ~/.nvm/nvm.sh

# Check Node version
node --version

# Should show: v20.10.0

# If wrong version:
nvm install 20.10.0
nvm use 20.10.0
nvm alias default 20.10.0
```

---

### 5. Verify Application Environment

```bash
cd /home/supergoose/my-analytics/app

# Check .env file exists
ls -la .env.production

# Verify critical variables (without showing values)
grep -E "DATABASE_URL|REDIS_URL|AUTH_SECRET|AUTH_URL" .env.production | cut -d'=' -f1

# Should show:
# DATABASE_URL
# REDIS_URL
# AUTH_SECRET
# AUTH_URL
```

---

## First Deployment Walkthrough

Follow these steps to test the CI/CD pipeline safely.

### Phase 1: Create Feature Branch

```bash
# On your local machine, in the project directory
cd /Users/frankdevlab/WebstormProjects/my-analytics

# Ensure you're on main and up to date
git checkout main
git pull origin main

# Create feature branch for CI/CD setup
git checkout -b feat/ci-cd-setup

# Verify all files exist
ls -la .github/workflows/
ls -la deployment/scripts/deploy.sh
ls -la app/src/app/api/health/route.ts

# Stage all CI/CD files
git add .github/
git add deployment/scripts/deploy.sh
git add app/src/app/api/health/route.ts

# Commit
git commit -m "feat: add GitHub Actions CI/CD pipeline

- Add CI workflow for lint, test, and build
- Add deployment workflow with dry-run support
- Add health check endpoint
- Add deployment script with rollback
- Add comprehensive debugging guide"

# Push to GitHub
git push origin feat/ci-cd-setup
```

### Phase 2: Verify CI Workflow Runs

1. Go to GitHub repository
2. Click **Actions** tab
3. You should see "CI - Continuous Integration" running
4. Click on the workflow run
5. Expand each job (Lint, Test, Build)
6. Verify all steps complete successfully

**Expected result**: ✅ All jobs pass

**If jobs fail**:
- Click on failed step
- Read error message
- Fix locally and push again
- See [DEBUGGING_CICD.md](DEBUGGING_CICD.md) for help

### Phase 3: Test Deployment in Dry-Run Mode

**IMPORTANT**: This tests deployment logic WITHOUT making changes.

1. Go to GitHub → **Actions** tab
2. Click **"CD - Deploy to Production"** workflow (left sidebar)
3. Click **"Run workflow"** dropdown (top-right)
4. Configure:
   - **Branch**: `feat/ci-cd-setup`
   - **Dry run**: ✅ `true`
5. Click **"Run workflow"** button
6. Wait for workflow to complete (~2 min)
7. Review logs:

```
[DRY-RUN] Would execute: git fetch origin main
[DRY-RUN] Would execute: git reset --hard origin/main
[DRY-RUN] Would execute: npm install
[DRY-RUN] Would execute: npx prisma migrate deploy
[DRY-RUN] Would execute: npm run build
[DRY-RUN] Would execute: sudo systemctl restart analytics.service
[DRY-RUN] Health check would verify: http://localhost:3000/api/health
```

**Verify**:
- ✅ All commands look correct?
- ✅ Paths are right (`/home/supergoose/my-analytics`)?
- ✅ No errors in SSH connection?

**If dry-run fails**: See [DEBUGGING_CICD.md](DEBUGGING_CICD.md)

### Phase 4: Merge to Main

Once CI passes and dry-run looks good:

```bash
# On your local machine
git checkout main
git pull origin main
git merge feat/ci-cd-setup
git push origin main
```

**What happens**:
1. CI workflow runs on main branch
2. Deploy workflow triggers automatically
3. Deployment executes (for real, not dry-run)

### Phase 5: Monitor First Deployment

1. Go to **Actions** tab
2. Click the running "Deploy to Production" workflow
3. Click "Deploy to Production" job
4. Watch logs in real-time

**Key steps to watch**:
- ✅ SSH connection succeeds
- ✅ Git pull completes
- ✅ Dependencies install
- ✅ Migrations apply
- ✅ Build succeeds
- ✅ Service restarts
- ✅ Health check passes

**Duration**: ~2-3 minutes

### Phase 6: Verify Deployment

1. **Check GitHub Actions**: Should show ✅ green checkmark
2. **Check deployment comment**: Look for commit comment with deployment status
3. **Test application**:
   ```
   https://analytics.franksblog.nl
   ```
4. **Test health endpoint**:
   ```
   https://analytics.franksblog.nl/api/health
   ```
5. **Check tracker script**:
   ```
   https://analytics.franksblog.nl/fb-a7k2.js
   ```

---

## Verification Checklist

After first deployment, verify everything works:

### GitHub Actions

- [ ] CI workflow passes on feature branches
- [ ] CI workflow passes on main branch
- [ ] Deploy workflow has dry-run option
- [ ] Deploy workflow can be manually triggered
- [ ] Deployment completes successfully
- [ ] Deployment comment posted on commits

### Server

- [ ] SSH connection works from GitHub Actions
- [ ] Deployment script executes successfully
- [ ] systemd service restarts correctly
- [ ] Application responds to requests
- [ ] Health endpoint returns 200 OK
- [ ] No errors in deployment.log

### Application

- [ ] Website loads: https://analytics.franksblog.nl
- [ ] Login works
- [ ] Dashboard displays data
- [ ] Tracker script serves: /fb-a7k2.js
- [ ] Database queries work
- [ ] Redis caching works

### Logs

```bash
# SSH to server
ssh -i ~/.ssh/id_rsa supergoose@95.111.243.79

# Check deployment log
tail -100 /home/supergoose/my-analytics/deployment.log

# Check service logs
sudo journalctl -u analytics.service -n 100

# Should see recent deployment messages
```

---

## Troubleshooting Initial Setup

### "SSH_PRIVATE_KEY secret not found"

**Cause**: Secret not configured in GitHub

**Solution**:
1. Go to Settings → Secrets → Actions
2. Verify `SSH_PRIVATE_KEY` exists
3. If missing, add it (see [SSH Key Setup](#ssh-key-setup))

---

### "Permission denied (publickey)"

**Cause**: Public key not on server

**Solution**:
```bash
# Copy public key
cat ~/.ssh/github-actions-deploy.pub

# SSH to server
ssh -i ~/.ssh/id_rsa supergoose@95.111.243.79

# Add to authorized_keys
echo "PASTE_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys

# Set permissions
chmod 600 ~/.ssh/authorized_keys
```

---

### "Service not found: analytics.service"

**Cause**: systemd service not installed

**Solution**: See `deployment/README.md` to set up systemd service

---

### "Health check failed"

**Possible causes**:
- Application crashed
- Port 3000 not listening
- Database/Redis down

**Solution**:
```bash
# SSH to server
ssh -i ~/.ssh/id_rsa supergoose@95.111.243.79

# Check service
sudo systemctl status analytics.service

# Check logs
sudo journalctl -u analytics.service -n 100

# Test health manually
curl -v http://localhost:3000/api/health

# Check database
docker ps | grep postgres

# Check Redis
docker ps | grep redis
```

---

### Workflow stuck on "Waiting for deployment approval"

**Cause**: Protected environment configured

**Solution**:
1. Go to Settings → Environments → production
2. Remove protection rules
3. Or approve deployment in Actions tab

---

## Next Steps

Once setup is complete:

1. ✅ **Every push to main** → Automatic deployment
2. ✅ **Every PR** → CI runs (lint, test, build)
3. ✅ **Manual deployments** → Use "Run workflow" with dry-run option
4. ✅ **Failed deployments** → Auto-rollback to previous version

### Ongoing Maintenance

- **Monitor deployments**: Check Actions tab regularly
- **Review logs**: Check `deployment.log` on server
- **Update dependencies**: Keep packages up-to-date
- **Rotate SSH keys**: Change every 6-12 months
- **Test rollback**: Practice manual rollback procedure

### Additional Features (Future)

Consider adding:
- Slack/Discord notifications
- Deployment approvals for production
- Staging environment with preview deployments
- Automated database backups before deployment
- Performance metrics tracking
- Deployment frequency dashboard

---

## Getting Help

If you encounter issues:

1. **Check debugging guide**: [DEBUGGING_CICD.md](DEBUGGING_CICD.md)
2. **Review workflow logs**: Actions tab → Failed run → Expand steps
3. **Check server logs**: `journalctl -u analytics.service`
4. **Test manually**: Run deployment script in dry-run mode
5. **Rollback**: Use manual rollback procedure

---

**Setup completed!** 🎉

Your CI/CD pipeline is now ready. Every push to `main` will automatically deploy to production.

---

**Last Updated**: 2025-10-31

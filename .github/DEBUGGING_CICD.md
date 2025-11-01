# CI/CD Pipeline Debugging Guide

Complete guide for debugging GitHub Actions workflows, deployment failures, and common CI/CD issues.

---

## Table of Contents

1. [Understanding GitHub Actions Logs](#understanding-github-actions-logs)
2. [Common CI Errors & Solutions](#common-ci-errors--solutions)
3. [Common Deployment Errors & Solutions](#common-deployment-errors--solutions)
4. [How to Debug Failed Deployments](#how-to-debug-failed-deployments)
5. [Testing Workflows Locally](#testing-workflows-locally)
6. [Debugging Decision Tree](#debugging-decision-tree)
7. [Manual Rollback Procedure](#manual-rollback-procedure)
8. [Advanced Debugging](#advanced-debugging)
9. [Performance Optimization](#performance-optimization)
10. [FAQ & Troubleshooting Matrix](#faq--troubleshooting-matrix)

---

## Understanding GitHub Actions Logs

### Accessing Workflow Logs

1. Go to your repository on GitHub
2. Click the **Actions** tab
3. Select the workflow run (either "CI" or "Deploy to Production")
4. Click on a job name to see its steps
5. Click on a step to expand its logs

### Log Structure

Each workflow run shows:
- **Overall status**: ✅ Success, ❌ Failure, ⚠️ Cancelled
- **Job execution time**: How long each job took
- **Step-by-step output**: Detailed logs for each step

### Reading Step Outputs

```
Run npm run build
  npm run build
  shell: /bin/bash -e {0}
  env:
    NODE_ENV: production

> build
> npm run build:tracker && next build

✓ Compiled successfully
```

**Key indicators**:
- `✓` - Step succeeded
- `Error:` - Step failed
- Exit code `0` - Success
- Exit code `non-zero` - Failure

### Downloading Logs

1. Go to workflow run
2. Click ⚙️ (gear icon) in top-right
3. Click "Download log archive"
4. Unzip and search locally

---

## Common CI Errors & Solutions

### 1. Cache Miss or Corruption

**Error**:
```
Error: Failed to restore cache
```

**Solution**:
```bash
# Clear cache manually:
# 1. Go to GitHub repo → Settings → Actions → Caches
# 2. Delete all caches
# 3. Re-run workflow
```

**Prevention**: Cache keys are based on `package-lock.json` hash. If packages change, cache auto-updates.

---

### 2. Test Failures

**Error**:
```
FAIL src/components/Dashboard.test.tsx
  × renders correctly (45ms)
```

**Solution**:
Tests are **non-blocking** (they don't fail the pipeline), but you should fix them:

```bash
# Run tests locally
cd app
npm test

# Run specific test
npm test -- Dashboard.test.tsx

# Run with coverage
npm test -- --coverage
```

**Note**: Tests run with `continue-on-error: true` so they won't block deployments.

---

### 3. Build Failures

**Error**:
```
Error: Command failed: npm run build
TypeScript error: Cannot find module '@/lib/utils'
```

**Solution**:
```bash
# 1. Check Node.js version matches
node --version  # Should be v20.10.0

# 2. Clean build cache
rm -rf app/.next app/node_modules

# 3. Reinstall dependencies
cd app
npm install

# 4. Try build locally
npm run build
```

---

### 4. Lint Errors

**Error**:
```
✖ 3 problems (3 errors, 0 warnings)
  3 errors and 0 warnings potentially fixable with the `--fix` option.
```

**Solution**:
```bash
# Run lint locally
cd app
npm run lint

# Auto-fix issues
npx eslint --fix .

# Check specific file
npx eslint src/path/to/file.ts
```

---

### 5. Dependency Installation Failed

**Error**:
```
npm ERR! code ENOTFOUND
npm ERR! network request to https://registry.npmjs.org/package failed
```

**Solution**:
- Usually temporary network issue
- Click "Re-run all jobs" in GitHub Actions
- If persists, check npm registry status: https://status.npmjs.org/

---

## Common Deployment Errors & Solutions

### 1. SSH Connection Refused

**Error**:
```
ssh: connect to host 95.111.243.79 port 22: Connection refused
```

**Possible Causes**:
- Incorrect `SERVER_IP` secret
- Server firewall blocking GitHub Actions IP
- SSH service not running on server

**Solution**:
```bash
# 1. Verify SSH_PRIVATE_KEY secret is correct
# Go to Settings → Secrets → SSH_PRIVATE_KEY

# 2. Test SSH from local machine
ssh -i ~/.ssh/id_rsa supergoose@95.111.243.79

# 3. Check server firewall
ssh -i ~/.ssh/id_rsa supergoose@95.111.243.79
sudo ufw status

# 4. Ensure SSH service is running
sudo systemctl status sshd
```

---

### 2. Permission Denied (publickey)

**Error**:
```
Permission denied (publickey).
```

**Possible Causes**:
- SSH private key not configured in GitHub Secrets
- Public key not added to server
- Wrong key format

**Solution**:
```bash
# 1. Check SSH_PRIVATE_KEY secret exists
# Go to Settings → Secrets → Actions

# 2. Verify public key is on server
ssh -i ~/.ssh/id_rsa supergoose@95.111.243.79
cat ~/.ssh/authorized_keys

# 3. Add key if missing
ssh-copy-id -i ~/.ssh/id_rsa.pub supergoose@95.111.243.79

# 4. Check key permissions
ls -la ~/.ssh/
# authorized_keys should be 600 or 644
```

---

### 3. Health Check Timeout

**Error**:
```
Health check failed after 10 attempts
```

**Possible Causes**:
- Application crashed during startup
- Port 3000 not listening
- Database/Redis connection failed
- systemd service not running

**Solution**:
```bash
# 1. SSH to server
ssh -i ~/.ssh/id_rsa supergoose@95.111.243.79

# 2. Check service status
sudo systemctl status analytics.service

# 3. View recent logs
sudo journalctl -u analytics.service -n 100 --no-pager

# 4. Check if port 3000 is listening
sudo lsof -i :3000

# 5. Test health endpoint manually
curl -v http://localhost:3000/api/health

# 6. Check application logs
cd /home/supergoose/my-analytics
tail -100 deployment.log
```

---

### 4. Database Migration Failed

**Error**:
```
Migration failed (exit code: 4)
```

**Possible Causes**:
- Database not running
- Migration file has errors
- Database schema conflicts

**Solution**:
```bash
# 1. Check database is running
docker ps | grep postgres

# 2. Check database connectivity
docker exec -it my-analytics-postgres psql -U postgres -d my_analytics -c "SELECT 1"

# 3. Review migration status
cd /home/supergoose/my-analytics/app
npx prisma migrate status

# 4. View migration files
ls -la prisma/migrations/

# 5. Apply migrations manually
npx prisma migrate deploy

# 6. If migration corrupted, resolve manually
npx prisma migrate resolve --applied <migration-name>
```

---

### 5. Build Failed on Server

**Error**:
```
Build failed (exit code: 5)
```

**Possible Causes**:
- Not enough disk space
- Node.js version mismatch
- Missing environment variables
- TypeScript errors

**Solution**:
```bash
# 1. Check disk space
df -h

# 2. Check Node.js version
node --version  # Should be v20.10.0

# 3. Check environment variables
cd /home/supergoose/my-analytics/app
cat .env.production | grep -E "DATABASE_URL|REDIS_URL|AUTH"

# 4. Try build manually
npm install
npm run build

# 5. Check build logs
tail -200 deployment.log
```

---

## How to Debug Failed Deployments

### Step-by-Step Debugging Process

#### 1. Check GitHub Actions Logs

```
1. Go to Actions tab
2. Click failed workflow run
3. Expand failed step
4. Read error message
5. Note exit code
```

#### 2. SSH to Server

```bash
ssh -i ~/.ssh/id_rsa supergoose@95.111.243.79
```

#### 3. Check Service Status

```bash
# Check if service is running
sudo systemctl status analytics.service

# If not running, check why
sudo journalctl -u analytics.service -n 100

# Restart service manually
sudo systemctl restart analytics.service
```

#### 4. Check Deployment Logs

```bash
cd /home/supergoose/my-analytics

# View full deployment log
cat deployment.log

# View last 100 lines
tail -100 deployment.log

# Search for errors
grep -i error deployment.log
```

#### 5. Test Health Endpoint

```bash
# Test locally on server
curl -v http://localhost:3000/api/health

# Expected response:
# HTTP/1.1 200 OK
# {"status":"ok","timestamp":"...","checks":{...}}

# If fails, check application logs
sudo journalctl -u analytics.service -f
```

#### 6. Check Dependencies

```bash
cd /home/supergoose/my-analytics/app

# Verify node_modules exists
ls -d node_modules

# Check critical packages
ls node_modules/.bin/next
ls node_modules/next
ls node_modules/react
```

#### 7. Verify Git State

```bash
cd /home/supergoose/my-analytics

# Check current commit
git rev-parse HEAD

# Check for uncommitted changes
git status

# View recent commits
git log --oneline -5
```

---

## Testing Workflows Locally

### Using `act` Tool (Local GitHub Actions Runner)

Install `act`:
```bash
# macOS
brew install act

# Linux
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash
```

Run workflows locally:
```bash
# Run CI workflow
act push

# Run specific job
act -j build

# Run with secrets
act -s SSH_PRIVATE_KEY="$(cat ~/.ssh/id_rsa)"

# Dry-run (show what would run)
act -n
```

**Note**: `act` has limitations and may not perfectly match GitHub Actions environment.

---

### Testing Deployment Script Manually

```bash
# SSH to server
ssh -i ~/.ssh/id_rsa supergoose@95.111.243.79

# Navigate to project
cd /home/supergoose/my-analytics

# Test in dry-run mode (safe)
./deployment/scripts/deploy.sh --dry-run --verbose

# Review what would happen, then run for real
./deployment/scripts/deploy.sh --verbose
```

---

## Debugging Decision Tree

```
Deployment failed?
│
├─ SSH connection failed?
│  ├─ Check SSH_PRIVATE_KEY secret exists
│  ├─ Verify server IP correct (95.111.243.79)
│  ├─ Test SSH from local: ssh supergoose@95.111.243.79
│  └─ Check server firewall allows port 22
│
├─ Health check timeout?
│  ├─ SSH to server
│  ├─ Check service status: systemctl status analytics.service
│  ├─ View logs: journalctl -u analytics.service -n 100
│  ├─ Test manually: curl localhost:3000/api/health
│  └─ Check application port: lsof -i :3000
│
├─ Build failed?
│  ├─ Check Node.js version: node --version (should be v20.10.0)
│  ├─ Check disk space: df -h
│  ├─ Verify dependencies: ls node_modules
│  ├─ Try build manually: npm run build
│  └─ Review build logs: tail deployment.log
│
├─ Migration failed?
│  ├─ Check database running: docker ps | grep postgres
│  ├─ Test connection: docker exec postgres psql -c "SELECT 1"
│  ├─ Check migration status: npx prisma migrate status
│  └─ Apply manually: npx prisma migrate deploy
│
├─ Service won't start?
│  ├─ Check systemd config: cat /etc/systemd/system/analytics.service
│  ├─ View service logs: journalctl -u analytics.service -xe
│  ├─ Check .env file: ls app/.env.production
│  └─ Test Node.js runs: node --version
│
└─ Unknown error?
   ├─ Check deployment.log: tail -200 /home/supergoose/my-analytics/deployment.log
   ├─ Review GitHub Actions logs
   ├─ Check system logs: journalctl -xe
   └─ Manually rollback (see below)
```

---

## Manual Rollback Procedure

If deployment fails and auto-rollback didn't work:

### Find Previous Working Commit

```bash
# SSH to server
ssh -i ~/.ssh/id_rsa supergoose@95.111.243.79

cd /home/supergoose/my-analytics

# View recent commits
git log --oneline -10

# Example output:
# abc1234 feat: add new feature (current - broken)
# def5678 fix: bug fix (previous - working)
# ghi9012 docs: update readme
```

### Rollback to Specific Commit

```bash
# Rollback to previous working commit
git reset --hard def5678

# Rebuild application
cd app
npm install
npm run build

# Restart service
sudo systemctl restart analytics.service

# Wait a few seconds
sleep 5

# Verify health
curl http://localhost:3000/api/health
```

### Verify Rollback Success

```bash
# Check service is running
sudo systemctl status analytics.service

# Check logs
sudo journalctl -u analytics.service -n 50

# Test from browser
# https://analytics.franksblog.nl
```

---

## Advanced Debugging

### Enabling Debug Mode in Workflows

Add to workflow file:

```yaml
- name: Enable debug logging
  run: echo "ACTIONS_RUNNER_DEBUG=true" >> $GITHUB_ENV
```

Then re-run workflow with debug enabled:
1. Go to Actions tab
2. Click "Re-run all jobs"
3. Check "Enable debug logging"

### SSH into GitHub Actions Runner (tmate)

For interactive debugging, add this step to workflow:

```yaml
- name: Setup tmate session
  uses: mxschmitt/action-tmate@v3
  if: failure()  # Only on failure
```

This gives you an SSH session into the failed runner.

### Debugging SSH Connection Issues

```bash
# Test SSH with verbose output
ssh -v -i ~/.ssh/id_rsa supergoose@95.111.243.79

# Check SSH key fingerprint
ssh-keygen -lf ~/.ssh/id_rsa

# Verify key matches authorized_keys on server
ssh supergoose@95.111.243.79 "ssh-keygen -lf ~/.ssh/authorized_keys"
```

### Testing Deployment Script Steps Individually

```bash
# SSH to server
ssh -i ~/.ssh/id_rsa supergoose@95.111.243.79

cd /home/supergoose/my-analytics

# Test git pull
git fetch origin main
git reset --hard origin/main

# Test dependency install
cd app
npm install

# Test migrations
npx prisma migrate deploy

# Test build
npm run build

# Test service restart
sudo systemctl restart analytics.service

# Test health check
for i in {1..5}; do
  curl -f http://localhost:3000/api/health && break
  sleep 5
done
```

---

## Performance Optimization

### Cache Hit/Miss Analysis

Check workflow logs for:
```
Cache restored successfully
Cache saved successfully
```

Or:
```
Cache not found for input keys: ...
```

**Improve cache hit rate**:
- Don't change `package-lock.json` unnecessarily
- Use restore-keys for partial matches
- Monitor cache size (max 10GB per repo)

### Workflow Runtime Breakdown

Typical CI workflow:
- Checkout: ~5s
- Setup Node: ~10s
- Install deps (cached): ~15s
- Install deps (uncached): ~60s
- Lint: ~10s
- Test: ~30s
- Build (cached): ~30s
- Build (uncached): ~120s

**Total**: 2-5 minutes depending on cache

### Identifying Bottlenecks

Add timing to steps:
```yaml
- name: Build
  run: |
    time npm run build
```

Review "Set up job" time - if high, runner provisioning is slow.

---

## FAQ & Troubleshooting Matrix

| Error Message | Cause | Solution |
|--------------|-------|----------|
| `ECONNREFUSED` | Service not running | Check `systemctl status analytics.service` |
| `Permission denied` | SSH key issue | Verify `SSH_PRIVATE_KEY` secret |
| `Port 3000 in use` | Old process running | Kill with `lsof -ti:3000 \| xargs kill` |
| `MODULE_NOT_FOUND` | Dependencies missing | Run `npm install` |
| `ENOSPC` | Out of disk space | Clean with `df -h && npm cache clean` |
| `Prisma Client not found` | Not generated | Run `npx prisma generate` |
| `Health check timeout` | App crashed | Check `journalctl -u analytics.service` |
| `Git merge conflict` | Dirty working tree | Run `git reset --hard HEAD` |
| `Node version mismatch` | Wrong Node.js | Check `.nvmrc` and use correct version |
| `TypeScript errors` | Type issues | Fix types locally, test with `npm run build` |

---

## Common Pitfalls

1. **Forgetting to commit changes**: Deployment pulls from git, not local files
2. **Testing on wrong branch**: Feature branches don't auto-deploy
3. **Missing environment variables**: `.env` on server must be complete
4. **Node version mismatch**: CI uses 20.10.0, server must match
5. **Database not running**: Docker containers must be up
6. **Disk space full**: Monitor with `df -h`
7. **Cache issues**: Clear cache in GitHub repo settings if corrupted

---

## Need More Help?

1. **Check deployment logs**: `/home/supergoose/my-analytics/deployment.log`
2. **Check service logs**: `journalctl -u analytics.service -n 100`
3. **Check GitHub Actions logs**: Actions tab → Failed run → Expand steps
4. **Test locally**: Run deployment script in `--dry-run` mode first
5. **Manual rollback**: Use git to revert to last working commit

---

**Last Updated**: 2025-10-31

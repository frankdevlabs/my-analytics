# Email Troubleshooting Guide

## Overview

This guide helps diagnose and resolve common issues with the Email Reports and Alerts feature. Use this guide when emails are not being sent, alerts are not firing, or delivery logs show errors.

---

## Quick Diagnostic Checklist

Before diving into detailed troubleshooting, verify these common issues:

- [ ] RESEND_API_KEY is configured in `.env`
- [ ] Email preferences are enabled (reportEnabled or alertEnabled = true)
- [ ] Cron jobs are running (check logs for "Email jobs initialized")
- [ ] Database is accessible (check connection string)
- [ ] User has valid email address configured
- [ ] Website has received pageviews (required for alerts)
- [ ] Rate limits not exceeded (100 emails/day free tier)

---

## Common Issues

### 1. Emails Not Being Sent

**Symptom:** No emails received despite enabled preferences

**Diagnostic Steps:**

1. **Check email preferences are enabled:**
   ```sql
   SELECT * FROM email_preferences
   WHERE user_id = 'your_user_id'
     AND (report_enabled = true OR spike_alert_enabled = true OR downtime_alert_enabled = true);
   ```

   **Expected:** At least one row returned with enabled = true

2. **Check delivery logs for send attempts:**
   ```sql
   SELECT * FROM email_delivery_logs
   WHERE user_id = 'your_user_id'
   ORDER BY sent_at DESC
   LIMIT 10;
   ```

   **Expected:** Recent log entries (within last 24 hours for daily reports)

3. **Check cron jobs are initialized:**
   ```bash
   grep "Email jobs initialized" logs/server.log
   ```

   **Expected:** Log entry on server startup

4. **Verify RESEND_API_KEY configured:**
   ```bash
   grep RESEND_API_KEY app/.env
   ```

   **Expected:** `RESEND_API_KEY="re_..."`

**Common Causes:**

- **Email preferences not saved** - Save preferences via UI or API
- **RESEND_API_KEY missing** - Add to `app/.env` file
- **Cron jobs not initialized** - Check `initializeEmailJobs()` called on server startup
- **Wrong server timezone** - Reports sent at 9am server time (check with `date` command)

**Resolution:**

1. Enable email preferences via settings UI
2. Add RESEND_API_KEY to `.env` file (get from https://resend.com/api-keys)
3. Restart server to initialize cron jobs
4. Wait for next scheduled job (check cron schedules in `/docs/cron-jobs.md`)

---

### 2. Rate Limit Exceeded Errors

**Symptom:** Delivery logs show "Rate limit exceeded" errors

**Diagnostic Steps:**

1. **Check daily email volume:**
   ```sql
   SELECT COUNT(*) FROM email_delivery_logs
   WHERE sent_at >= CURRENT_DATE
     AND status = 'SENT';
   ```

   **Warning:** >80 emails/day (approaching 100 free tier limit)

2. **Check failed emails due to rate limit:**
   ```sql
   SELECT COUNT(*), error_message
   FROM email_delivery_logs
   WHERE sent_at >= CURRENT_DATE
     AND status = 'FAILED'
     AND error_message LIKE '%rate limit%'
   GROUP BY error_message;
   ```

3. **Check email volume by type:**
   ```sql
   SELECT email_type, COUNT(*) as count
   FROM email_delivery_logs
   WHERE sent_at >= CURRENT_DATE
   GROUP BY email_type
   ORDER BY count DESC;
   ```

**Common Causes:**

- **Too many sites with daily reports** - Free tier: 100 emails/day
- **Alert spam** - Low cooldown periods causing frequent alerts
- **Multiple alerts per site** - Both spike and downtime enabled with short cooldowns
- **Monthly limit exceeded** - 3000 emails/month

**Resolution:**

**Short-term:**
1. Increase alert cooldown periods (from 1 hour to 2-4 hours)
2. Disable alerts for low-priority sites
3. Switch from daily to weekly reports for some sites
4. Wait until next day for rate limit reset

**Long-term:**
1. Upgrade Resend plan (https://resend.com/pricing)
2. Implement email digest (combine multiple alerts into one email)
3. Use different email service for alerts vs reports
4. Add rate limit monitoring and warnings

**Prevention:**
```sql
-- Find sites with short cooldowns
SELECT website_id, alert_cooldown_hours
FROM email_preferences
WHERE (spike_alert_enabled = true OR downtime_alert_enabled = true)
  AND alert_cooldown_hours < 2;

-- Find sites with daily reports
SELECT COUNT(*) FROM email_preferences
WHERE report_enabled = true AND report_schedule = 'DAILY';
```

---

### 3. Traffic Spike Alerts Not Firing

**Symptom:** High traffic but no spike alert received

**Diagnostic Steps:**

1. **Verify spike alert enabled:**
   ```sql
   SELECT spike_alert_enabled, spike_threshold, last_spike_triggered_at
   FROM email_preferences
   WHERE website_id = 'your_website_id';
   ```

   **Expected:** spike_alert_enabled = true, threshold configured

2. **Check current traffic vs threshold:**
   ```sql
   SELECT COUNT(*) as pageviews_last_hour
   FROM pageviews
   WHERE website_id = 'your_website_id'
     AND added_iso >= NOW() - INTERVAL '60 minutes';
   ```

   **Compare:** pageviews_last_hour should exceed spike_threshold

3. **Check cooldown status:**
   ```sql
   SELECT
     last_spike_triggered_at,
     alert_cooldown_hours,
     (last_spike_triggered_at + (alert_cooldown_hours || ' hours')::INTERVAL) as cooldown_until
   FROM email_preferences
   WHERE website_id = 'your_website_id';
   ```

   **Expected:** cooldown_until is in the past (cooldown expired)

4. **Check delivery logs for suppressed alerts:**
   ```bash
   grep "Alert suppressed by cooldown" logs/server.log | grep spike
   ```

**Common Causes:**

- **Cooldown active** - Last alert within cooldown period (default 1 hour)
- **Threshold too high** - Traffic hasn't reached configured threshold
- **Insufficient data** - Less than 60 minutes of pageviews (alert skipped)
- **Alert disabled** - spike_alert_enabled = false

**Resolution:**

1. **If cooldown active:** Wait for cooldown to expire or reduce cooldown hours
2. **If threshold too high:** Lower spike_threshold to appropriate level
3. **If insufficient data:** Wait for 60 minutes of pageviews before alert fires
4. **If disabled:** Enable spike alert in settings UI

**Example Fix:**
```sql
-- Lower threshold from 1000 to 500
UPDATE email_preferences
SET spike_threshold = 500
WHERE website_id = 'your_website_id';

-- Reduce cooldown from 2 hours to 1 hour
UPDATE email_preferences
SET alert_cooldown_hours = 1
WHERE website_id = 'your_website_id';
```

---

### 4. Downtime Alerts Firing Incorrectly

**Symptom:** Receiving downtime alerts when site is up

**Diagnostic Steps:**

1. **Check downtime configuration:**
   ```sql
   SELECT downtime_alert_enabled, downtime_threshold_minutes, last_downtime_triggered_at
   FROM email_preferences
   WHERE website_id = 'your_website_id';
   ```

2. **Check actual pageview frequency:**
   ```sql
   SELECT
     MAX(added_iso) as last_pageview,
     EXTRACT(EPOCH FROM (NOW() - MAX(added_iso))) / 60 as minutes_since_last
   FROM pageviews
   WHERE website_id = 'your_website_id';
   ```

3. **Check 7-day average pageviews:**
   ```sql
   SELECT
     COUNT(*) as total_pageviews,
     COUNT(*) / 7.0 as avg_per_day
   FROM pageviews
   WHERE website_id = 'your_website_id'
     AND added_iso >= NOW() - INTERVAL '7 days';
   ```

**Common Causes:**

- **Low traffic site** - Site naturally has gaps in pageviews
- **Threshold too low** - 5-10 minutes may cause false positives
- **Weekend/night traffic** - Normal for some sites to have quiet periods
- **Bot filtering** - Legitimate traffic filtered as bots

**Resolution:**

1. **For low traffic sites (< 100/day):**
   - Disable downtime alerts (high false positive rate)
   - Use uptime monitoring service instead (e.g., UptimeRobot, Pingdom)

2. **For medium traffic sites (100-1000/day):**
   - Increase threshold to 30-60 minutes
   - Monitor during business hours only (future feature)

3. **For high traffic sites (> 1000/day):**
   - Keep threshold at 15-30 minutes
   - Investigate if alerts fire (likely real outage)

**Example Fix:**
```sql
-- Disable for low traffic site
UPDATE email_preferences
SET downtime_alert_enabled = false
WHERE website_id = 'your_website_id';

-- Increase threshold from 15 to 60 minutes
UPDATE email_preferences
SET downtime_threshold_minutes = 60
WHERE website_id = 'your_website_id';
```

**Use Downtime Suggestion API:**
```bash
curl -X GET 'http://localhost:3000/api/settings/email/downtime-suggestion?websiteId=your_website_id' \
  --cookie cookies.txt
```

---

### 5. Reports Show Zero Data

**Symptom:** Email reports received but show "0 pageviews"

**Diagnostic Steps:**

1. **Verify pageviews exist in database:**
   ```sql
   SELECT COUNT(*) as total_pageviews
   FROM pageviews
   WHERE website_id = 'your_website_id'
     AND added_iso >= NOW() - INTERVAL '24 hours';
   ```

   **Expected:** Count > 0

2. **Check website_id association:**
   ```sql
   SELECT COUNT(*) as with_website_id
   FROM pageviews
   WHERE website_id IS NOT NULL
     AND added_iso >= NOW() - INTERVAL '24 hours';
   ```

3. **Check report generation query:**
   ```bash
   grep "Generating report for" logs/server.log | tail -5
   ```

**Common Causes:**

- **No pageviews in time period** - Site genuinely received no traffic
- **Wrong website_id** - Pageviews associated with different website
- **Pageviews have NULL website_id** - Legacy data before multi-site feature
- **Query date range issue** - Report querying wrong time range

**Resolution:**

1. **If no traffic:** Wait for site to receive pageviews
2. **If wrong website_id:** Verify tracking script uses correct API key
3. **If NULL website_id:** Legacy data (expected), future pageviews will have website_id
4. **If query issue:** Check report date range logic (daily = last 24h, weekly = last 7d)

**Manual Test:**
```bash
# Trigger report job manually
cd app
node -e "require('./lib/jobs/send-reports').sendDailyReports().then(console.log)"
```

---

### 6. Cron Jobs Not Running

**Symptom:** No log entries indicating job execution

**Diagnostic Steps:**

1. **Check for initialization log:**
   ```bash
   grep "Email jobs initialized" logs/server.log | tail -1
   ```

   **Expected:** Recent timestamp (on server startup)

2. **Check for job execution logs:**
   ```bash
   grep "Starting.*report job" logs/server.log | tail -5
   grep "Starting alert check job" logs/server.log | tail -5
   ```

   **Expected:** Entries matching cron schedules (9am for reports, every 15min for alerts)

3. **Verify server timezone:**
   ```bash
   date
   TZ=UTC date
   ```

   **Note:** Jobs run at 9am server time, not UTC

4. **Check node-cron is running:**
   ```bash
   ps aux | grep node
   ```

   **Expected:** Next.js process running

**Common Causes:**

- **initializeEmailJobs() never called** - Integration missing
- **Server timezone different from expected** - 9am server time != 9am your time
- **Multiple server instances** - node-cron doesn't support distributed scheduling
- **Server restarts between schedules** - Jobs lost on restart (node-cron limitation)

**Resolution:**

1. **If missing initialization:**
   - Add `initializeEmailJobs()` call to server startup code
   - Check Next.js initialization file (layout.tsx or API route)

2. **If timezone issue:**
   - Set TZ environment variable: `TZ=America/New_York npm start`
   - Or adjust cron schedule to match server timezone

3. **If multiple instances:**
   - Migrate to BullMQ for distributed scheduling (see `/docs/bullmq-migration.md`)
   - Or designate one instance as "scheduler" instance

4. **Manual job trigger for testing:**
   ```bash
   cd app
   node -e "require('./lib/jobs/email-scheduler').initializeEmailJobs(); setTimeout(() => process.exit(0), 60000)"
   ```

---

### 7. Failed Emails in Delivery Log

**Symptom:** Email delivery logs show status = FAILED

**Diagnostic Steps:**

1. **Check error messages:**
   ```sql
   SELECT email_type, error_message, COUNT(*)
   FROM email_delivery_logs
   WHERE status = 'FAILED'
     AND sent_at >= NOW() - INTERVAL '7 days'
   GROUP BY email_type, error_message
   ORDER BY COUNT(*) DESC;
   ```

2. **Check Resend API key validity:**
   ```bash
   curl -X POST 'https://api.resend.com/emails' \
     -H "Authorization: Bearer $RESEND_API_KEY" \
     -H 'Content-Type: application/json' \
     -d '{"from":"onboarding@resend.dev","to":"test@example.com","subject":"Test","html":"Test"}'
   ```

3. **Check recipient email validity:**
   ```sql
   SELECT recipient_email, COUNT(*)
   FROM email_delivery_logs
   WHERE status = 'FAILED'
   GROUP BY recipient_email;
   ```

**Common Error Messages:**

| Error Message | Cause | Resolution |
|---------------|-------|------------|
| Rate limit exceeded | Too many emails sent | Wait 24 hours or upgrade plan |
| Invalid API key | Wrong or expired key | Update RESEND_API_KEY in .env |
| Invalid recipient email | Malformed email address | Update user email in database |
| Domain not verified | Resend domain verification incomplete | Verify domain in Resend dashboard |
| Connection timeout | Network/API unavailable | Retry (automatic with backoff) |

**Resolution by Error Type:**

**Rate Limit:**
- Wait until next day (limit resets midnight UTC)
- Reduce email volume (see section 2)
- Upgrade Resend plan

**Invalid API Key:**
```bash
# Update .env file
echo 'RESEND_API_KEY="re_new_key_here"' >> app/.env

# Restart server
pm2 restart my-analytics
```

**Invalid Email:**
```sql
-- Update user email
UPDATE users
SET email = 'valid@example.com'
WHERE id = 'user_id';
```

**Domain Not Verified:**
1. Go to https://resend.com/domains
2. Add your domain (e.g., example.com)
3. Add DNS records (SPF, DKIM, DMARC)
4. Wait for verification (can take up to 48 hours)
5. Update email templates to use verified domain

---

### 8. Alert Cooldown Not Working

**Symptom:** Receiving multiple alerts within cooldown period

**Diagnostic Steps:**

1. **Check alert timestamps:**
   ```sql
   SELECT
     email_type,
     sent_at,
     LAG(sent_at) OVER (PARTITION BY email_type ORDER BY sent_at) as prev_sent_at,
     EXTRACT(EPOCH FROM (sent_at - LAG(sent_at) OVER (PARTITION BY email_type ORDER BY sent_at))) / 3600 as hours_between
   FROM email_delivery_logs
   WHERE website_id = 'your_website_id'
     AND email_type IN ('TRAFFIC_SPIKE', 'DOWNTIME')
   ORDER BY sent_at DESC
   LIMIT 10;
   ```

   **Expected:** hours_between >= alert_cooldown_hours

2. **Check preference cooldown configuration:**
   ```sql
   SELECT alert_cooldown_hours, last_spike_triggered_at, last_downtime_triggered_at
   FROM email_preferences
   WHERE website_id = 'your_website_id';
   ```

3. **Check for log messages:**
   ```bash
   grep "Alert suppressed by cooldown" logs/server.log | grep "your_website_id"
   ```

**Common Causes:**

- **Multiple preference records** - Duplicate preferences for same site
- **Cooldown not updating** - last_triggered_at not being updated after alert
- **Multiple alert types** - Spike and downtime have separate cooldowns
- **Timezone issues** - Cooldown check using wrong timezone

**Resolution:**

1. **Check for duplicate preferences:**
   ```sql
   SELECT website_id, COUNT(*)
   FROM email_preferences
   GROUP BY website_id
   HAVING COUNT(*) > 1;
   ```

   **If duplicates found, delete extras:**
   ```sql
   DELETE FROM email_preferences
   WHERE id NOT IN (
     SELECT MIN(id)
     FROM email_preferences
     GROUP BY website_id
   );
   ```

2. **Verify timestamp updates:**
   - Check `updateLastTriggered()` function in DAL
   - Ensure timestamp updated immediately after alert sent

3. **Monitor cooldown enforcement:**
   ```bash
   # Watch for suppressed alerts in real-time
   tail -f logs/server.log | grep "suppressed"
   ```

---

## Advanced Diagnostics

### Database Query Performance

If email jobs are slow or timing out:

```sql
-- Enable query timing
\timing

-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%pageviews%'
  OR query LIKE '%email_preferences%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check missing indexes
SELECT schemaname, tablename, attname
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
  AND tablename IN ('pageviews', 'email_preferences', 'email_delivery_logs');
```

### Resend API Debugging

Test Resend API directly:

```bash
# Send test email
curl -X POST 'https://api.resend.com/emails' \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "onboarding@resend.dev",
    "to": "your@email.com",
    "subject": "Test from My Analytics",
    "html": "<p>This is a test email</p>"
  }'

# Check API status
curl 'https://api.resend.com/emails' \
  -H "Authorization: Bearer $RESEND_API_KEY"
```

### Job Execution Monitoring

Monitor job health:

```bash
# Count job executions today
grep "Starting.*job" logs/server.log | grep "$(date +%Y-%m-%d)" | wc -l

# Check job durations
grep "complete:" logs/server.log | tail -20

# Find failed job runs
grep "Failed to" logs/server.log | tail -20

# Monitor memory usage
ps aux | grep node | awk '{print $6/1024 " MB"}'
```

---

## Prevention Best Practices

### 1. Monitor Email Volume

Set up alerts when approaching rate limits:

```sql
-- Daily email count
SELECT COUNT(*) FROM email_delivery_logs
WHERE sent_at >= CURRENT_DATE;

-- Set alert at 80% of daily limit (80 emails)
-- Set alert at 90% of monthly limit (2700 emails)
```

### 2. Configure Appropriate Cooldowns

Recommended cooldown periods by site traffic:

| Traffic Level | Recommended Cooldown |
|---------------|----------------------|
| Low (< 100/day) | 4-6 hours |
| Medium (100-1000/day) | 2-4 hours |
| High (> 1000/day) | 1-2 hours |

### 3. Use Downtime Suggestion API

Always check suggestion before enabling downtime alerts:

```bash
curl -X GET 'http://localhost:3000/api/settings/email/downtime-suggestion?websiteId=website_123' \
  --cookie cookies.txt
```

### 4. Test Email Configuration

After changing settings, manually trigger jobs:

```bash
cd app
node -e "require('./lib/jobs/send-reports').sendDailyReports().then(console.log)"
node -e "require('./lib/jobs/check-alerts').checkAlerts().then(console.log)"
```

### 5. Regular Delivery Log Review

Weekly review of delivery logs:

```sql
-- Success rate last 7 days
SELECT
  DATE(sent_at) as date,
  status,
  COUNT(*) as count
FROM email_delivery_logs
WHERE sent_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(sent_at), status
ORDER BY date DESC;

-- Most common errors
SELECT error_message, COUNT(*)
FROM email_delivery_logs
WHERE status = 'FAILED'
  AND sent_at >= NOW() - INTERVAL '30 days'
GROUP BY error_message
ORDER BY COUNT(*) DESC;
```

---

## Getting Help

If this guide doesn't resolve your issue:

1. **Check delivery logs** - Most issues are logged with error details
2. **Review cron-jobs.md** - Job scheduling and execution details
3. **Check api-email-endpoints.md** - API validation rules and examples
4. **Review database-schema.md** - Data model and constraints
5. **Check Resend status page** - https://status.resend.com
6. **Open GitHub issue** - Include logs, error messages, and steps to reproduce

### Information to Include in Bug Reports

- Email delivery log entries (from database)
- Server log excerpts (grep for job names)
- Email preference configuration (SQL query result)
- Resend API key status (valid/expired)
- Server timezone and current time
- Database query performance (EXPLAIN ANALYZE output)
- Next.js version and node version

---

## Quick Reference Commands

```bash
# Check job initialization
grep "Email jobs initialized" logs/server.log

# Check recent job runs
grep "Starting.*job" logs/server.log | tail -20

# Check failed emails
psql -d my_analytics -c "SELECT * FROM email_delivery_logs WHERE status = 'FAILED' ORDER BY sent_at DESC LIMIT 10;"

# Manual job trigger
cd app && node -e "require('./lib/jobs/send-reports').sendDailyReports().then(console.log)"

# Check rate limit status
psql -d my_analytics -c "SELECT COUNT(*) FROM email_delivery_logs WHERE sent_at >= CURRENT_DATE;"

# Check alert cooldown
psql -d my_analytics -c "SELECT website_id, last_spike_triggered_at, last_downtime_triggered_at, alert_cooldown_hours FROM email_preferences WHERE spike_alert_enabled = true OR downtime_alert_enabled = true;"
```

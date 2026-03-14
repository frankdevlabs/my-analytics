# Cron Jobs Documentation

## Overview

My Analytics uses `node-cron` for scheduling background jobs that power the Email Reports and Alerts feature. All cron jobs run within the Next.js application process and are initialized automatically on server startup.

## Cron Schedules

### 1. Daily Reports Job

**Schedule:** `0 9 * * *` (Every day at 9:00 AM server time)

**Purpose:** Sends daily analytics reports to users who have enabled daily email reports

**Execution Flow:**
1. Query all email preferences where `reportEnabled = true` AND `reportSchedule = 'DAILY'`
2. For each matching site:
   - Generate report for last 24 hours
   - Send email via Resend API
   - Log delivery status to `email_delivery_logs`
   - Continue to next site on error (no job abort)
3. Return job summary with total sent/failed counts

**Code Location:** `/app/lib/jobs/send-reports.ts` - `sendDailyReports()`

**Average Duration:** 1-5 seconds per site (sequential processing)

**Error Handling:**
- Connection errors: Stop processing, log critical error
- Individual site errors: Log error with context, continue to next site
- Email send failures: Retry 3 times with exponential backoff (100ms, 200ms, 400ms)

### 2. Weekly Reports Job

**Schedule:** `0 9 * * 1` (Every Monday at 9:00 AM server time)

**Purpose:** Sends weekly analytics reports to users who have enabled weekly email reports

**Execution Flow:**
1. Query all email preferences where `reportEnabled = true` AND `reportSchedule = 'WEEKLY'`
2. For each matching site:
   - Generate report for last 7 days
   - Calculate period-over-period comparison vs previous 7 days
   - Send email via Resend API
   - Log delivery status
3. Return job summary

**Code Location:** `/app/lib/jobs/send-reports.ts` - `sendWeeklyReports()`

**Average Duration:** 1-5 seconds per site

**Error Handling:** Same as daily reports

### 3. Monthly Reports Job

**Schedule:** `0 9 1 * *` (1st of every month at 9:00 AM server time)

**Purpose:** Sends monthly analytics reports to users who have enabled monthly email reports

**Execution Flow:**
1. Query all email preferences where `reportEnabled = true` AND `reportSchedule = 'MONTHLY'`
2. For each matching site:
   - Generate report for last 30 days
   - Calculate period-over-period comparison vs previous 30 days
   - Send email via Resend API
   - Log delivery status
3. Return job summary

**Code Location:** `/app/lib/jobs/send-reports.ts` - `sendMonthlyReports()`

**Average Duration:** 1-5 seconds per site

**Error Handling:** Same as daily reports

### 4. Alert Checks Job

**Schedule:** `*/15 * * * *` (Every 15 minutes)

**Purpose:** Monitors for traffic spikes and downtime alerts across all sites

**Execution Flow:**
1. Query all email preferences where `spikeAlertEnabled = true` OR `downtimeAlertEnabled = true`
2. Deduplicate sites (avoid checking same site twice if both alerts enabled)
3. For each site:
   - **Traffic Spike Check:**
     - Count pageviews in last 60 minutes
     - If count > `spikeThreshold` AND cooldown expired:
       - Send spike alert email
       - Update `lastSpikeTriggeredAt` timestamp
     - Else if cooldown active: Log "Alert suppressed by cooldown"
   - **Downtime Check:**
     - Query last pageview timestamp
     - If no pageviews for `downtimeThresholdMinutes` AND cooldown expired:
       - Send downtime alert email
       - Update `lastDowntimeTriggeredAt` timestamp
     - Skip if `downtimeAlertEnabled = false`
     - Skip if site has never received pageviews
4. Return job summary with alerts sent/suppressed counts

**Code Location:** `/app/lib/jobs/check-alerts.ts` - `checkAlerts()`

**Average Duration:** <5 seconds per spec (usually 1-2 seconds)

**Error Handling:** Same as report jobs

## Job Initialization

### Automatic Startup

Cron jobs are initialized automatically when the Next.js server starts via the **instrumentation.ts** file.

**Implementation Location:** `/app/src/instrumentation.ts`

Next.js 13.2+ automatically detects and loads the instrumentation.ts file on server startup. The `register()` function is called to initialize background services:

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initializeEmailJobs } = await import('../lib/jobs/email-scheduler');
    initializeEmailJobs();
    console.log('[Server] Background jobs initialization complete');
  }
}
```

**Job Scheduler Location:** `/app/lib/jobs/email-scheduler.ts`

The `initializeEmailJobs()` function schedules all four cron jobs:

```typescript
export function initializeEmailJobs() {
  // Daily reports: 9am every day
  cron.schedule('0 9 * * *', async () => {
    console.log('Starting daily report job');
    await sendDailyReports();
  });

  // Weekly reports: Monday 9am
  cron.schedule('0 9 * * 1', async () => {
    console.log('Starting weekly report job');
    await sendWeeklyReports();
  });

  // Monthly reports: 1st of month 9am
  cron.schedule('0 9 1 * *', async () => {
    console.log('Starting monthly report job');
    await sendMonthlyReports();
  });

  // Alert checks: Every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('Starting alert check job');
    await checkAlerts();
  });

  console.log('Email jobs initialized successfully');
}
```

### Execution Behavior

- **Production:** Runs once when the server process starts
- **Development:** Runs on first page load, may run again during hot module reloading
- **Protection:** Built-in singleton flag prevents duplicate job registration

### Verifying Initialization

After starting the server, check logs for confirmation:

```bash
# Look for initialization messages
grep "Email jobs initialized" logs/server.log
grep "Background jobs initialization complete" logs/server.log
```

Expected output:
```
[Server] Background jobs initialization complete
Email jobs initialized successfully
- Daily reports: 9am every day
- Weekly reports: Monday at 9am
- Monthly reports: 1st of month at 9am
- Alert checks: Every 15 minutes
```

### Duplicate Initialization Prevention

The scheduler includes protection against duplicate job initialization. If `initializeEmailJobs()` is called multiple times (e.g., during development hot reloads), only the first call will schedule the jobs.

Implementation:
```typescript
let jobsInitialized = false;

export function initializeEmailJobs(): void {
  if (jobsInitialized) {
    console.log('Email jobs already initialized, skipping');
    return;
  }
  // ... schedule jobs ...
  jobsInitialized = true;
}
```

## Error Handling Patterns

### Three-Tier Error Model

1. **Critical Errors (Connection Failures)**
   - Stop processing immediately
   - Log error with full context
   - Return partial results if any sites were processed
   - Examples: Database connection lost, Redis unavailable

2. **Individual Site Errors**
   - Log error with site ID and context
   - Continue processing next site (graceful degradation)
   - Include in job summary error list
   - Examples: Invalid email address, missing data

3. **Transient Errors**
   - Retry with exponential backoff (using `retryWithBackoff` helper)
   - 3 attempts: 100ms, 200ms, 400ms delays
   - Log each retry attempt
   - Examples: Database timeout, API rate limit

### Logging Pattern

All jobs follow a consistent logging pattern:

```
[Timestamp] Starting [job name] job
[Timestamp] Processing site 3 of 5
[Timestamp] [Success/Error message with context]
[Timestamp] Job complete: X sent, Y failed
```

### Example Error Log

```
2025-11-21T09:00:00.000Z Starting daily report job for 5 sites
2025-11-21T09:00:01.234Z Report sent to user@example.com for site abc123
2025-11-21T09:00:02.567Z Failed to send report for site def456: Resend API rate limit exceeded
2025-11-21T09:00:03.890Z Daily report job complete: 4 sent, 1 failed
```

## Performance Considerations

### Sequential Processing

Sites are processed sequentially (not in parallel) to:
1. Avoid overwhelming Resend API (100 emails/day free tier)
2. Prevent database connection pool exhaustion
3. Ensure predictable resource usage

### Query Optimization

All queries use appropriate indexes:
- `idx_email_preferences_user_id` - User preference lookup
- `idx_email_preferences_website_id` - Site-specific preferences
- `idx_pageviews_website_id` - Alert queries filtering by site
- `idx_pageviews_added_iso` - Time range filtering for reports

### Target Performance

- Alert checks: <5 seconds total (spec requirement)
- Report generation: <30 seconds per site (spec requirement)
- Email sending: <2 seconds per email (Resend API)

## Rate Limiting

### Resend Free Tier Limits

- **Daily:** 100 emails/day
- **Monthly:** 3000 emails/month

### Protection Strategy

1. **Sequential Processing:** One email at a time prevents burst violations
2. **Error Detection:** Resend API rate limit errors caught and logged
3. **Retry Logic:** Exponential backoff allows temporary rate limit recovery
4. **Monitoring:** Email delivery logs track volume and failures

### When to Upgrade

Consider upgrading Resend plan when:
- Users regularly hit 100 emails/day limit
- Monthly volume consistently exceeds 2500 emails
- Rate limit errors appear in delivery logs
- Multiple sites with daily reports enabled

## Migration Path to BullMQ

### When to Migrate

Migrate from node-cron to BullMQ when you need:
1. **Multi-instance deployment** - Running Next.js on multiple servers
2. **Horizontal scaling** - More than 100 active users with email reports
3. **Job persistence** - Jobs must survive server restarts
4. **Advanced features** - Job prioritization, delayed jobs, job repeating patterns

### Node-cron Limitations

1. **Single Process Only** - Jobs run in Next.js process, can't distribute across servers
2. **No Persistence** - Jobs lost on server restart (must wait for next schedule)
3. **No Visibility** - Can't inspect queued jobs or retry failed jobs manually
4. **Memory Constraints** - All job state in application memory

### Migration Path

See `/docs/bullmq-migration.md` for detailed migration guide including:
- Required infrastructure (Redis for job queue)
- Code changes required (BullMQ job definitions)
- Deployment architecture changes
- Testing strategy for migration

## Troubleshooting

### Jobs Not Running

**Symptom:** No logs indicating job execution

**Potential Causes:**
1. `initializeEmailJobs()` never called on server startup
2. Server timezone different from expected (jobs run at 9am server time)
3. Cron syntax error preventing job scheduling

**Resolution:**
```bash
# Check server logs for "Email jobs initialized" message
grep "Email jobs initialized" logs/server.log

# Verify server timezone
date
TZ=UTC date

# Test manual job execution
cd app
node -e "require('./lib/jobs/send-reports').sendDailyReports().then(console.log)"
```

### Reports Not Sending

**Symptom:** Jobs run but no emails received

**Potential Causes:**
1. No email preferences configured (reportEnabled = false)
2. RESEND_API_KEY invalid or missing
3. Rate limit exceeded (check delivery logs)
4. Recipient email invalid

**Resolution:**
```bash
# Check delivery logs for errors
psql -d my_analytics -c "SELECT * FROM email_delivery_logs WHERE status = 'FAILED' ORDER BY sent_at DESC LIMIT 10;"

# Verify Resend API key configured
grep RESEND_API_KEY app/.env

# Check email preferences
psql -d my_analytics -c "SELECT * FROM email_preferences WHERE report_enabled = true;"
```

### Alert Checks Taking Too Long

**Symptom:** Alert checks exceed 5 second target

**Potential Causes:**
1. Missing indexes on pageviews table
2. Large number of sites with alerts enabled
3. Database connection slow

**Resolution:**
```sql
-- Verify indexes exist
\d pageviews

-- Check query performance
EXPLAIN ANALYZE
SELECT COUNT(*) FROM pageviews
WHERE website_id = 'abc123' AND added_iso >= NOW() - INTERVAL '60 minutes';

-- Check for slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%pageviews%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### High Memory Usage

**Symptom:** Node.js process memory grows during job execution

**Potential Causes:**
1. Large result sets not properly paginated
2. Memory leak in job processing loop
3. Too many sites processed sequentially without garbage collection

**Resolution:**
- Monitor memory with `process.memoryUsage()` logs
- Consider batching sites (process 10 at a time, then garbage collect)
- Upgrade to BullMQ for distributed processing

## Monitoring

### Recommended Metrics

1. **Job Execution Time** - Track duration of each job run
2. **Email Send Rate** - Monitor emails sent per hour/day
3. **Error Rate** - Track failed jobs and emails
4. **Delivery Success Rate** - Percentage of emails delivered successfully
5. **Alert Suppression Rate** - How often cooldowns prevent alerts

### Log Analysis

```bash
# Count daily report executions
grep "Starting daily report job" logs/server.log | wc -l

# Find failed email sends
grep "Failed to send" logs/server.log

# Check alert suppression rate
grep "Alert suppressed by cooldown" logs/server.log | wc -l

# View job summaries
grep "complete:" logs/server.log | tail -20
```

### Database Queries

```sql
-- Email delivery statistics (last 7 days)
SELECT
  DATE(sent_at) as date,
  email_type,
  status,
  COUNT(*) as count
FROM email_delivery_logs
WHERE sent_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(sent_at), email_type, status
ORDER BY date DESC, email_type, status;

-- Sites with most frequent alerts
SELECT
  website_id,
  COUNT(*) as alert_count
FROM email_delivery_logs
WHERE email_type IN ('TRAFFIC_SPIKE', 'DOWNTIME')
  AND sent_at >= NOW() - INTERVAL '30 days'
GROUP BY website_id
ORDER BY alert_count DESC
LIMIT 10;

-- Average report generation time (estimated from send timestamps)
SELECT
  email_type,
  AVG(EXTRACT(EPOCH FROM (sent_at - LAG(sent_at) OVER (ORDER BY sent_at)))) as avg_seconds
FROM email_delivery_logs
WHERE email_type IN ('DAILY_REPORT', 'WEEKLY_REPORT', 'MONTHLY_REPORT')
GROUP BY email_type;
```

## Security Considerations

1. **Email Addresses** - Recipient emails logged in delivery logs (ensure GDPR compliance)
2. **Error Messages** - May contain sensitive API responses (sanitize before logging)
3. **Rate Limiting** - Sequential processing protects against abuse
4. **Authentication** - No direct job triggers exposed (only cron schedules)

## Next Steps

For production deployments, consider:
1. Setting up log aggregation (e.g., CloudWatch, Datadog)
2. Creating alerts for failed jobs or high error rates
3. Implementing job execution metrics dashboard
4. Planning BullMQ migration for horizontal scaling (see `/docs/bullmq-migration.md`)

# BullMQ Migration Guide

## Overview

This guide explains when and how to migrate from `node-cron` to BullMQ for background job processing. BullMQ provides distributed, persistent job queues backed by Redis, enabling horizontal scaling and improved reliability.

**Current Implementation:** node-cron (MVP approach)

**Migration Target:** BullMQ + Redis

**Migration Complexity:** Medium (requires infrastructure changes and code refactoring)

---

## When to Migrate

### Node-cron Limitations

Migrate from node-cron to BullMQ when you encounter these limitations:

1. **Multi-Instance Deployment**
   - Problem: node-cron runs in Next.js process, jobs duplicate across instances
   - Impact: Multiple servers send duplicate emails
   - Threshold: Deploying to more than 1 server instance

2. **Job Persistence**
   - Problem: Jobs lost on server restart
   - Impact: Missed reports if restart happens during scheduled job
   - Threshold: Uptime SLA requires job recovery after restart

3. **Horizontal Scaling**
   - Problem: Jobs can't distribute across workers
   - Impact: All jobs run on single server, can't scale processing
   - Threshold: >100 active users with daily reports

4. **Job Visibility**
   - Problem: Can't inspect queued jobs or retry failed jobs
   - Impact: No admin interface to monitor or manually retry jobs
   - Threshold: Need operational visibility for production monitoring

5. **Advanced Scheduling**
   - Problem: Basic cron syntax only, no complex scheduling patterns
   - Impact: Can't implement dynamic scheduling or job prioritization
   - Threshold: Need features like job delays, priority queues, or rate limiting

### When NOT to Migrate

Stay with node-cron if:
- Single server deployment (no multi-instance concerns)
- <50 active users with email reports
- MVP/prototype stage (BullMQ adds complexity)
- No need for job persistence (acceptable to miss jobs on restart)
- Limited Redis infrastructure available

---

## Migration Overview

### High-Level Steps

1. Set up Redis infrastructure (dedicated instance for job queues)
2. Install BullMQ dependencies
3. Create BullMQ queue and worker definitions
4. Refactor cron jobs to BullMQ jobs
5. Update server initialization to start workers
6. Deploy and test in staging environment
7. Monitor and tune for production

**Estimated Time:** 2-4 days for complete migration + testing

**Rollback Strategy:** Keep node-cron code in place during migration, feature flag to switch back

---

## Infrastructure Setup

### Redis Requirements

**Dedicated Redis Instance:**
- Separate from session/cache Redis (different persistence needs)
- Persistent storage (AOF enabled for job recovery)
- At least 512MB memory (scales with job volume)
- Network access from all application servers

**Redis Configuration:**

```bash
# redis.conf for BullMQ
maxmemory-policy noeviction  # Never evict jobs
appendonly yes                # Enable AOF persistence
appendfsync everysec          # Fsync every second (balance performance/durability)
```

**Docker Compose Example:**

```yaml
services:
  redis-jobs:
    image: redis:7.4-alpine
    container_name: my-analytics-redis-jobs
    command: redis-server --appendonly yes --appendfsync everysec --maxmemory-policy noeviction
    ports:
      - "6380:6379"  # Different port from session Redis
    volumes:
      - redis-jobs-data:/data
    restart: unless-stopped

volumes:
  redis-jobs-data:
```

**Environment Variable:**

```bash
# app/.env
REDIS_JOB_QUEUE_URL="redis://localhost:6380"
```

---

## Code Migration

### Step 1: Install Dependencies

```bash
cd app
npm install bullmq@5.34.1 ioredis@5.4.1
```

**Dependencies:**
- `bullmq` - Job queue library
- `ioredis` - Redis client (peer dependency)

### Step 2: Create BullMQ Connection

Create `/app/lib/jobs/queue-connection.ts`:

```typescript
import { Queue, Worker, QueueScheduler } from 'bullmq';
import IORedis from 'ioredis';

// Redis connection for BullMQ
const connection = new IORedis(process.env.REDIS_JOB_QUEUE_URL || 'redis://localhost:6380', {
  maxRetriesPerRequest: null, // BullMQ requirement
  enableReadyCheck: false,
});

// Export connection for reuse
export { connection };

// Helper to create queues
export function createQueue(name: string) {
  return new Queue(name, { connection });
}

// Helper to create workers
export function createWorker(name: string, processor: any, concurrency = 1) {
  return new Worker(name, processor, {
    connection,
    concurrency,
    limiter: {
      max: 10,        // Max 10 jobs per duration
      duration: 1000, // 1 second (rate limiting)
    },
  });
}
```

### Step 3: Define Job Queues

Create `/app/lib/jobs/queues.ts`:

```typescript
import { createQueue } from './queue-connection';

// Define queues for each job type
export const reportQueue = createQueue('email-reports');
export const alertQueue = createQueue('email-alerts');

// Job types
export enum JobType {
  DAILY_REPORT = 'daily-report',
  WEEKLY_REPORT = 'weekly-report',
  MONTHLY_REPORT = 'monthly-report',
  ALERT_CHECK = 'alert-check',
}

// Job data interfaces
export interface ReportJobData {
  schedule: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  triggeredAt: Date;
}

export interface AlertJobData {
  triggeredAt: Date;
}
```

### Step 4: Create Workers

Create `/app/lib/jobs/workers/report-worker.ts`:

```typescript
import { Job } from 'bullmq';
import { createWorker } from '../queue-connection';
import { sendDailyReports, sendWeeklyReports, sendMonthlyReports } from '../send-reports';
import { ReportJobData, JobType } from '../queues';

// Report job processor
async function processReportJob(job: Job<ReportJobData>) {
  console.log(`[BullMQ] Processing ${job.name} job (ID: ${job.id})`);

  try {
    let result;

    switch (job.name) {
      case JobType.DAILY_REPORT:
        result = await sendDailyReports();
        break;
      case JobType.WEEKLY_REPORT:
        result = await sendWeeklyReports();
        break;
      case JobType.MONTHLY_REPORT:
        result = await sendMonthlyReports();
        break;
      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }

    console.log(`[BullMQ] Report job complete:`, result);
    return result;
  } catch (error) {
    console.error(`[BullMQ] Report job failed:`, error);
    throw error; // BullMQ will handle retries
  }
}

// Create worker with concurrency of 1 (sequential processing)
export const reportWorker = createWorker('email-reports', processReportJob, 1);

// Worker event listeners
reportWorker.on('completed', (job) => {
  console.log(`[BullMQ] Job ${job.id} completed successfully`);
});

reportWorker.on('failed', (job, err) => {
  console.error(`[BullMQ] Job ${job?.id} failed:`, err);
});

reportWorker.on('error', (err) => {
  console.error('[BullMQ] Worker error:', err);
});
```

Create `/app/lib/jobs/workers/alert-worker.ts`:

```typescript
import { Job } from 'bullmq';
import { createWorker } from '../queue-connection';
import { checkAlerts } from '../check-alerts';
import { AlertJobData, JobType } from '../queues';

// Alert job processor
async function processAlertJob(job: Job<AlertJobData>) {
  console.log(`[BullMQ] Processing alert check job (ID: ${job.id})`);

  try {
    const result = await checkAlerts();
    console.log(`[BullMQ] Alert check complete:`, result);
    return result;
  } catch (error) {
    console.error(`[BullMQ] Alert check failed:`, error);
    throw error;
  }
}

// Create worker with concurrency of 1
export const alertWorker = createWorker('email-alerts', processAlertJob, 1);

// Worker event listeners
alertWorker.on('completed', (job) => {
  console.log(`[BullMQ] Alert job ${job.id} completed successfully`);
});

alertWorker.on('failed', (job, err) => {
  console.error(`[BullMQ] Alert job ${job?.id} failed:`, err);
});

alertWorker.on('error', (err) => {
  console.error('[BullMQ] Alert worker error:', err);
});
```

### Step 5: Create Scheduler

Create `/app/lib/jobs/bullmq-scheduler.ts`:

```typescript
import { reportQueue, alertQueue, JobType, ReportJobData, AlertJobData } from './queues';
import { reportWorker } from './workers/report-worker';
import { alertWorker } from './workers/alert-worker';

// Initialize BullMQ workers and schedules
export async function initializeBullMQJobs() {
  console.log('[BullMQ] Initializing job workers...');

  // Start workers (automatically process jobs from queues)
  // Workers are already created in worker files, just need to ensure they're imported

  // Schedule repeatable jobs
  await reportQueue.add(
    JobType.DAILY_REPORT,
    { schedule: 'DAILY', triggeredAt: new Date() } as ReportJobData,
    {
      repeat: {
        pattern: '0 9 * * *', // 9am daily
        tz: 'America/New_York', // Explicit timezone
      },
      removeOnComplete: 100, // Keep last 100 completed jobs
      removeOnFail: 200,     // Keep last 200 failed jobs
    }
  );

  await reportQueue.add(
    JobType.WEEKLY_REPORT,
    { schedule: 'WEEKLY', triggeredAt: new Date() } as ReportJobData,
    {
      repeat: {
        pattern: '0 9 * * 1', // Monday 9am
        tz: 'America/New_York',
      },
      removeOnComplete: 100,
      removeOnFail: 200,
    }
  );

  await reportQueue.add(
    JobType.MONTHLY_REPORT,
    { schedule: 'MONTHLY', triggeredAt: new Date() } as ReportJobData,
    {
      repeat: {
        pattern: '0 9 1 * *', // 1st of month 9am
        tz: 'America/New_York',
      },
      removeOnComplete: 100,
      removeOnFail: 200,
    }
  );

  await alertQueue.add(
    JobType.ALERT_CHECK,
    { triggeredAt: new Date() } as AlertJobData,
    {
      repeat: {
        pattern: '*/15 * * * *', // Every 15 minutes
      },
      removeOnComplete: 50,
      removeOnFail: 100,
    }
  );

  console.log('[BullMQ] Jobs scheduled:');
  console.log('  - Daily reports: 9am daily');
  console.log('  - Weekly reports: Monday 9am');
  console.log('  - Monthly reports: 1st of month 9am');
  console.log('  - Alert checks: Every 15 minutes');
}

// Graceful shutdown
export async function shutdownBullMQJobs() {
  console.log('[BullMQ] Shutting down workers...');
  await reportWorker.close();
  await alertWorker.close();
  console.log('[BullMQ] Workers shut down successfully');
}
```

### Step 6: Update Server Initialization

Replace node-cron initialization with BullMQ initialization:

```typescript
// Before (node-cron)
import { initializeEmailJobs } from '@/lib/jobs/email-scheduler';
initializeEmailJobs();

// After (BullMQ)
import { initializeBullMQJobs, shutdownBullMQJobs } from '@/lib/jobs/bullmq-scheduler';
import { reportWorker } from '@/lib/jobs/workers/report-worker';
import { alertWorker } from '@/lib/jobs/workers/alert-worker';

// Initialize on server start
await initializeBullMQJobs();

// Graceful shutdown on process termination
process.on('SIGTERM', async () => {
  await shutdownBullMQJobs();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await shutdownBullMQJobs();
  process.exit(0);
});
```

---

## Deployment Architecture

### Single Instance (Before Migration)

```
┌─────────────────┐
│   Next.js App   │
│   + node-cron   │
│   + Jobs        │
└─────────────────┘
        │
        ├──> PostgreSQL
        └──> Redis (sessions)
```

### Multi-Instance (After Migration)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js #1    │     │   Next.js #2    │     │   Next.js #3    │
│   + BullMQ      │     │   + BullMQ      │     │   + BullMQ      │
│     Worker      │     │     Worker      │     │     Worker      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        └───────────────────────┴───────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │   Redis (Job Queue)   │
                    └───────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │     PostgreSQL        │
                    └───────────────────────┘
```

**Benefits:**
- Jobs distributed across all instances (automatic load balancing)
- No duplicate job execution (BullMQ handles locking)
- Job persistence (survives instance restarts)
- Horizontal scalability (add more instances as needed)

---

## Testing Strategy

### Local Testing

1. **Start Redis for jobs:**
   ```bash
   docker run -d -p 6380:6379 --name redis-jobs redis:7.4-alpine redis-server --appendonly yes
   ```

2. **Update .env:**
   ```bash
   REDIS_JOB_QUEUE_URL="redis://localhost:6380"
   ```

3. **Run application:**
   ```bash
   cd app
   npm run dev
   ```

4. **Monitor BullMQ dashboard:**
   ```bash
   npm install -g bull-board
   bull-board --redis redis://localhost:6380
   # Open http://localhost:3000/admin/queues
   ```

5. **Manually trigger jobs:**
   ```typescript
   import { reportQueue, JobType } from '@/lib/jobs/queues';

   // Add job to queue
   await reportQueue.add(JobType.DAILY_REPORT, {
     schedule: 'DAILY',
     triggeredAt: new Date(),
   });
   ```

### Staging Environment

1. Deploy to staging with BullMQ enabled
2. Run for 1 week to validate:
   - All scheduled jobs execute on time
   - No duplicate emails sent
   - Failed jobs retry correctly
   - Job metrics look healthy
3. Compare email delivery logs with node-cron baseline
4. Monitor Redis memory usage and job queue depth

### Production Rollout

1. **Phase 1: Canary Deployment**
   - Enable BullMQ on 1 server instance (10% traffic)
   - Disable node-cron on that instance
   - Monitor for 48 hours
   - Compare metrics with node-cron instances

2. **Phase 2: Gradual Rollout**
   - Enable BullMQ on 50% of instances
   - Monitor for 1 week
   - Check for any anomalies

3. **Phase 3: Full Migration**
   - Enable BullMQ on all instances
   - Remove node-cron code
   - Update monitoring dashboards

---

## Monitoring and Operations

### BullMQ Dashboard

Install Bull Board for web-based queue management:

```bash
npm install @bull-board/api@5.23.4 @bull-board/express@5.23.4
```

Create `/app/src/app/api/admin/queues/route.ts`:

```typescript
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { reportQueue, alertQueue } from '@/lib/jobs/queues';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/api/admin/queues');

createBullBoard({
  queues: [
    new BullMQAdapter(reportQueue),
    new BullMQAdapter(alertQueue),
  ],
  serverAdapter,
});

export const GET = serverAdapter.getRouter();
```

Access at: `http://localhost:3000/api/admin/queues`

**Features:**
- View queued, active, completed, and failed jobs
- Manually retry failed jobs
- Pause/resume queues
- View job data and logs
- Monitor queue metrics

### Metrics to Monitor

**Queue Health:**
- Active jobs count (should be low, jobs process quickly)
- Waiting jobs count (should be 0 between scheduled runs)
- Failed jobs count (investigate if > 5%)
- Job processing duration (target: reports <30s, alerts <5s)

**Redis Metrics:**
- Memory usage (should be <50% of allocated)
- Connection count (one per worker)
- Commands per second
- Key eviction count (should be 0 with noeviction policy)

**Application Metrics:**
- Email delivery success rate
- Job retry count
- Worker uptime
- Job lag (time between scheduled and actual execution)

### Alerting Rules

Set up alerts for:
- Failed job count > 10 in 1 hour
- Job lag > 5 minutes
- Redis memory > 80%
- Worker down for > 5 minutes
- Queue depth > 100 jobs

---

## Performance Tuning

### Worker Concurrency

Adjust concurrency based on workload:

```typescript
// Low traffic (<50 sites): Concurrency 1
export const reportWorker = createWorker('email-reports', processReportJob, 1);

// Medium traffic (50-200 sites): Concurrency 2-3
export const reportWorker = createWorker('email-reports', processReportJob, 2);

// High traffic (>200 sites): Concurrency 5-10
export const reportWorker = createWorker('email-reports', processReportJob, 5);
```

**Trade-offs:**
- Higher concurrency = faster processing but more resource usage
- Sequential (concurrency 1) prevents Resend rate limit issues
- Consider Resend plan limits when increasing concurrency

### Rate Limiting

Built-in rate limiting per worker:

```typescript
export const reportWorker = createWorker('email-reports', processReportJob, {
  concurrency: 1,
  limiter: {
    max: 10,        // Max 10 jobs
    duration: 1000, // Per 1 second
  },
});
```

### Job Priorities

Add priority to urgent jobs:

```typescript
// High priority (process first)
await alertQueue.add(JobType.ALERT_CHECK, data, { priority: 1 });

// Normal priority (default)
await reportQueue.add(JobType.DAILY_REPORT, data, { priority: 5 });

// Low priority (process last)
await reportQueue.add(JobType.MONTHLY_REPORT, data, { priority: 10 });
```

### Memory Optimization

Limit job history retention:

```typescript
await reportQueue.add(JobType.DAILY_REPORT, data, {
  removeOnComplete: 50,  // Keep last 50 completed jobs
  removeOnFail: 100,     // Keep last 100 failed jobs
});
```

Clean up old jobs periodically:

```typescript
// Run daily cleanup
await reportQueue.clean(1000 * 60 * 60 * 24, 100, 'completed'); // 24 hours, keep 100
await reportQueue.clean(1000 * 60 * 60 * 24 * 7, 200, 'failed'); // 7 days, keep 200
```

---

## Rollback Plan

If issues arise during migration:

### Option 1: Feature Flag Rollback

```typescript
// app/lib/jobs/job-initializer.ts
export async function initializeJobs() {
  const useBullMQ = process.env.USE_BULLMQ === 'true';

  if (useBullMQ) {
    console.log('[Jobs] Using BullMQ');
    await initializeBullMQJobs();
  } else {
    console.log('[Jobs] Using node-cron');
    initializeEmailJobs();
  }
}
```

**Rollback:**
```bash
# .env
USE_BULLMQ=false  # Switch back to node-cron

# Restart application
pm2 restart my-analytics
```

### Option 2: Graceful Degradation

Keep both systems running temporarily:

```typescript
// Run both node-cron and BullMQ
initializeEmailJobs();      // node-cron (fallback)
await initializeBullMQJobs(); // BullMQ (primary)

// If BullMQ fails, node-cron continues running
```

### Option 3: Code Revert

```bash
# Revert to previous commit
git revert <bullmq-migration-commit>
git push

# Deploy previous version
pm2 deploy production
```

---

## Cost Considerations

### Redis Costs

**Managed Redis (e.g., AWS ElastiCache, Redis Cloud):**
- Small instance (512MB): ~$15-30/month
- Medium instance (2GB): ~$50-100/month
- High availability (replication): +50-100%

**Self-Hosted Redis:**
- VPS (1GB RAM, 1 CPU): ~$5-10/month
- Requires maintenance and monitoring

### Development Costs

- Engineering time: 2-4 days for migration
- Testing time: 1-2 weeks in staging
- Monitoring setup: 1-2 days
- Documentation updates: 1 day

**Total:** ~$500-2000 depending on team rates

### Operational Benefits

- Reduced server costs (better resource utilization)
- Improved reliability (fewer missed jobs)
- Easier debugging (job visibility)
- Horizontal scaling capability (prepare for growth)

---

## Common Issues and Solutions

### Issue 1: Redis Connection Errors

**Error:** `ECONNREFUSED` or `Connection timeout`

**Solution:**
- Verify Redis is running: `redis-cli -p 6380 ping`
- Check REDIS_JOB_QUEUE_URL in .env
- Verify network connectivity between app and Redis
- Check Redis auth if enabled

### Issue 2: Duplicate Jobs

**Error:** Same job executing multiple times

**Solution:**
- Check `repeat` configuration has correct job ID
- Ensure only one instance schedules jobs (use scheduler role)
- Or use BullMQ's built-in deduplication:
  ```typescript
  await queue.add(name, data, { jobId: 'unique-job-id' });
  ```

### Issue 3: Memory Leaks

**Error:** Redis memory grows unbounded

**Solution:**
- Set job retention limits (removeOnComplete, removeOnFail)
- Run periodic cleanup
- Monitor Redis memory with alerts
- Increase Redis maxmemory if needed

### Issue 4: Stale Jobs

**Error:** Old jobs never complete

**Solution:**
- Implement job timeout:
  ```typescript
  await queue.add(name, data, { timeout: 300000 }); // 5 minutes
  ```
- Monitor for stale jobs in dashboard
- Manually remove/retry stuck jobs

---

## Best Practices

1. **Start Simple** - Migrate one queue at a time (reports first, then alerts)
2. **Monitor Closely** - Set up dashboards before migration
3. **Test Thoroughly** - Run in staging for at least 1 week
4. **Gradual Rollout** - Canary → 50% → 100%
5. **Keep Rollback Option** - Feature flag or keep node-cron code for 30 days
6. **Document Everything** - Update runbooks and alert rules
7. **Train Team** - Ensure ops team understands BullMQ dashboard
8. **Automate Ops** - Scripts for common tasks (cleanup, retry, monitoring)

---

## Resources

- **BullMQ Documentation:** https://docs.bullmq.io
- **Bull Board (UI):** https://github.com/felixmosh/bull-board
- **Redis Configuration:** https://redis.io/docs/management/config/
- **Example Migration:** https://github.com/OptimalBits/bull/blob/master/MIGRATION.md

---

## Conclusion

Migrating from node-cron to BullMQ is recommended for production deployments with:
- Multiple server instances
- >100 active users
- Need for job persistence and visibility

The migration requires infrastructure changes (Redis) and code refactoring but provides significant operational benefits including distributed processing, job persistence, and horizontal scalability.

Follow the phased rollout approach and monitor closely during migration. Keep rollback options available for the first 30 days.

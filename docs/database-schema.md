# Database Schema Documentation

## Overview

This document describes the complete database schema for My Analytics, including the Email Reports and Alerts feature. The application uses PostgreSQL 17.6 with Prisma ORM for type-safe database access.

**Database Name:** `my_analytics`

**ORM:** Prisma v6.18.0

**Schema Location:** `/app/prisma/schema.prisma`

---

## Core Analytics Models

### Pageview

Stores comprehensive analytics data for every pageview tracked across all websites.

**Table:** `pageviews`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (cuid) | PRIMARY KEY | Unique pageview identifier |
| page_id | String | NOT NULL | Unique page identifier (combined session + path hash) |
| visitor_hash | String | NOT NULL | Anonymized visitor identifier (hashed IP + UA) |
| session_id | String | NOT NULL | Session identifier for grouping pageviews |
| path | String (2048) | NOT NULL | Page path (e.g., /blog/post-title) |
| referrer | String (2048) | NULL | Full referrer URL |
| referrer_domain | String (255) | NULL | Referrer domain only |
| query_params | String (2048) | NULL | URL query parameters |
| country | String (2) | NULL | ISO 3166-1 alpha-2 country code |
| device_type | DeviceType | NULL | desktop, mobile, or tablet |
| browser | String (100) | NULL | Browser name |
| browser_version | String (50) | NULL | Browser version |
| os | String (100) | NULL | Operating system |
| os_version | String (50) | NULL | OS version |
| screen_width | Integer | NULL | Screen width in pixels |
| viewport_width | Integer | NULL | Viewport width in pixels |
| language | String (10) | NULL | Browser language (e.g., en-US) |
| is_bot | Boolean | DEFAULT false | Bot detection flag |
| added_iso | Timestamptz(3) | DEFAULT now() | Pageview timestamp (UTC) |
| website_id | String | NULL | Foreign key to websites table |

**Indexes:**
- `idx_pageviews_added_iso` - Time range queries
- `idx_pageviews_path` - Path-based queries
- `idx_pageviews_path_added_iso` - Path + time queries
- `idx_pageviews_visitor_hash_added_iso` - Unique visitor queries
- `idx_pageviews_referrer_domain` - Referrer analysis
- `idx_pageviews_country` - Geographic queries
- `idx_pageviews_device_type` - Device-based queries
- `idx_pageviews_website_id` - Multi-site filtering

**Relations:**
- `events` - One-to-many with Event (via page_id)
- `website` - Many-to-one with Website (via website_id, optional)

**Notes:**
- `website_id` is nullable for backwards compatibility (NULL = default site)
- `visitor_hash` uses SHA-256 hashing for privacy compliance
- `added_iso` stored in UTC, indexed for efficient time range queries

---

### Event

Stores custom event tracking data (button clicks, form submissions, etc.).

**Table:** `events`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (cuid) | PRIMARY KEY | Unique event identifier |
| page_id | String | NOT NULL, FK | Reference to pageviews table |
| event_name | String (255) | NOT NULL | Event name (e.g., button_click) |
| event_metadata | JSONB | NULL | Custom event properties |
| added_iso | Timestamptz(3) | DEFAULT now() | Event timestamp (UTC) |

**Indexes:**
- `idx_events_page_id` - Lookup events for pageview
- `idx_events_event_name` - Filter by event type
- `idx_events_added_iso` - Time range queries

**Relations:**
- `pageview` - Many-to-one with Pageview (via page_id, CASCADE delete)

---

## User Management Models

### User

Stores user account information for authentication.

**Table:** `users`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (cuid) | PRIMARY KEY | Unique user identifier |
| email | String (255) | UNIQUE, NOT NULL | User email (login username) |
| password | String (255) | NOT NULL | Bcrypt hashed password (cost 12) |
| name | String (255) | NOT NULL | Display name |
| mfa_enabled | Boolean | DEFAULT false | MFA enrollment status |
| totp_secret | String (255) | NULL | Encrypted TOTP secret (AES-256-GCM) |
| created_at | Timestamptz(3) | DEFAULT now() | Account creation timestamp |
| updated_at | Timestamptz(3) | UPDATED | Last modification timestamp |

**Indexes:**
- `idx_users_email` - Login lookup

**Relations:**
- `backupCodes` - One-to-many with BackupCode

**Security:**
- Password hashed with bcrypt (cost factor 12)
- TOTP secret encrypted with AES-256-GCM using MFA_ENCRYPTION_KEY
- Email used as unique username

---

### BackupCode

Stores MFA backup codes for account recovery.

**Table:** `backup_codes`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (cuid) | PRIMARY KEY | Unique code identifier |
| user_id | String | NOT NULL, FK | Reference to users table |
| code | String (255) | UNIQUE, NOT NULL | Backup code (hashed) |
| used_at | Timestamptz(3) | NULL | Timestamp when code was used |
| created_at | Timestamptz(3) | DEFAULT now() | Code creation timestamp |

**Indexes:**
- `idx_backup_codes_user_id` - User's codes lookup
- `idx_backup_codes_code` - Code validation

**Relations:**
- `user` - Many-to-one with User (via user_id, CASCADE delete)

**Security:**
- Codes hashed before storage (bcrypt)
- `used_at` prevents code reuse

---

## Email Features Models

### Website

Stores website configurations for multi-site analytics and email preferences.

**Table:** `websites`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (cuid) | PRIMARY KEY | Unique website identifier |
| domain | String (255) | NOT NULL | Website domain (e.g., example.com) |
| user_id | String | NOT NULL | Owner user ID |
| api_key | String (255) | UNIQUE, NOT NULL | Tracking script authentication key |
| created_at | Timestamptz(3) | DEFAULT now() | Website creation timestamp |

**Indexes:**
- `idx_websites_user_id` - User's websites lookup
- `idx_websites_api_key` - API key validation for tracking

**Relations:**
- `emailPreferences` - One-to-many with EmailPreference
- `emailLogs` - One-to-many with EmailDeliveryLog
- `pageviews` - One-to-many with Pageview

**Notes:**
- `api_key` must be unique to prevent security issues
- `user_id` enables multi-user support in future

---

### EmailPreference

Stores email report and alert preferences (global and per-site).

**Table:** `email_preferences`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (cuid) | PRIMARY KEY | Unique preference identifier |
| user_id | String | NOT NULL | Owner user ID |
| website_id | String | NULL, FK | NULL = global defaults, else site-specific |
| report_schedule | EmailSchedule | NULL | DAILY, WEEKLY, or MONTHLY |
| report_enabled | Boolean | DEFAULT false | Enable/disable email reports |
| spike_alert_enabled | Boolean | DEFAULT false | Enable/disable traffic spike alerts |
| spike_threshold | Integer | NULL | Pageviews/hour threshold for spike |
| last_spike_triggered_at | Timestamptz(3) | NULL | Last spike alert timestamp (cooldown) |
| downtime_alert_enabled | Boolean | DEFAULT false | Enable/disable downtime alerts |
| downtime_threshold_minutes | Integer | NULL | Minutes without pageviews threshold |
| last_downtime_triggered_at | Timestamptz(3) | NULL | Last downtime alert timestamp (cooldown) |
| alert_cooldown_hours | Integer | DEFAULT 1 | Hours between alerts of same type |
| template_config | JSONB | NULL | Report customization JSON |
| created_at | Timestamptz(3) | DEFAULT now() | Preference creation timestamp |
| updated_at | Timestamptz(3) | UPDATED | Last modification timestamp |

**Indexes:**
- `idx_email_preferences_user_id` - User preferences lookup
- `idx_email_preferences_website_id` - Site-specific preferences

**Relations:**
- `website` - Many-to-one with Website (via website_id, CASCADE delete)

**Validation Rules:**
- `spike_threshold`: 1-100,000 (required if spike_alert_enabled = true)
- `downtime_threshold_minutes`: 5-1440 (required if downtime_alert_enabled = true)
- `alert_cooldown_hours`: 0.083-24 (5 minutes to 24 hours)

**Template Config Schema:**
```json
{
  "includePageviews": true,
  "includeUniqueVisitors": true,
  "includeTopPages": true,
  "includeTopReferrers": true,
  "includeComparison": true,
  "topPagesLimit": 5
}
```

**Notes:**
- NULL `website_id` = global defaults (fallback for sites without specific preferences)
- `last_*_triggered_at` fields used for cooldown enforcement
- `updated_at` automatically updated by Prisma on modification

---

### EmailDeliveryLog

Audit trail for all email send attempts (success and failure).

**Table:** `email_delivery_logs`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (cuid) | PRIMARY KEY | Unique log identifier |
| user_id | String | NOT NULL | Recipient user ID |
| website_id | String | NULL, FK | Associated website (NULL = global) |
| email_type | EmailType | NOT NULL | Report or alert type |
| recipient_email | String (255) | NOT NULL | Email address sent to |
| sent_at | Timestamptz(3) | DEFAULT now() | Send attempt timestamp |
| status | EmailStatus | NOT NULL | SENT or FAILED |
| error_message | Text | NULL | Error details if FAILED |

**Indexes:**
- `idx_email_logs_user_id` - User's email history
- `idx_email_logs_sent_at` - Time-based queries (DESC sorting)
- `idx_email_logs_status` - Filter by success/failure

**Relations:**
- `website` - Many-to-one with Website (via website_id, CASCADE delete)

**Notes:**
- `status` is binary (SENT or FAILED) for simplicity
- `error_message` may contain Resend API error responses
- Indexed on `sent_at` DESC for efficient pagination
- `website_id` nullable to support global emails (e.g., account notifications)

---

## Enums

### DeviceType

**Values:**
- `desktop` - Desktop/laptop computers
- `mobile` - Mobile phones
- `tablet` - Tablet devices

**Usage:** Pageview.device_type

---

### EmailSchedule

**Values:**
- `DAILY` - Send reports daily at 9am
- `WEEKLY` - Send reports weekly (Monday 9am)
- `MONTHLY` - Send reports monthly (1st at 9am)

**Usage:** EmailPreference.report_schedule

---

### EmailType

**Values:**
- `DAILY_REPORT` - Daily analytics report
- `WEEKLY_REPORT` - Weekly analytics report
- `MONTHLY_REPORT` - Monthly analytics report
- `TRAFFIC_SPIKE` - Traffic spike alert
- `DOWNTIME` - Downtime alert

**Usage:** EmailDeliveryLog.email_type

---

### EmailStatus

**Values:**
- `SENT` - Email delivered successfully
- `FAILED` - Email delivery failed

**Usage:** EmailDeliveryLog.status

---

## Entity Relationship Diagram (Text Format)

```
User
├── BackupCode (1:N, CASCADE)
├── Website (1:N, no FK in schema)
│   ├── EmailPreference (1:N, CASCADE)
│   ├── EmailDeliveryLog (1:N, CASCADE)
│   └── Pageview (1:N, SET NULL)
└── EmailPreference (1:N, no FK - filtered by user_id)

Pageview
├── Event (1:N, CASCADE)
└── Website (N:1, optional)
```

**Cascade Behaviors:**
- Delete Website → Cascade delete EmailPreference, EmailDeliveryLog
- Delete Website → Set NULL on Pageview.website_id (preserve analytics)
- Delete Pageview → Cascade delete Event
- Delete User → Cascade delete BackupCode

---

## Migrations

### Migration History

1. **Initial Schema** - User, Pageview, Event models
2. **MFA Support** - BackupCode model, User.mfa_enabled, User.totp_secret
3. **Email Features** (`20251121193036_add_email_features`) - Website, EmailPreference, EmailDeliveryLog, enums

**Migration Location:** `/app/prisma/migrations/`

**Migration Commands:**
```bash
# Apply migrations (production)
npx prisma migrate deploy

# Create new migration (development)
npx prisma migrate dev --name description_of_changes

# Generate Prisma Client (after schema changes)
npx prisma generate

# View migration status
npx prisma migrate status
```

---

## Indexes Strategy

### Performance Targets

- Alert checks: <5 seconds per spec
- Report generation: <30 seconds per site per spec
- API queries: <100ms P95

### Index Types Used

1. **Single Column Indexes** - Foreign keys, frequently filtered columns
2. **Composite Indexes** - Multi-column queries (path + time, visitor + time)
3. **DESC Indexes** - Pagination queries (sent_at DESC)

### Index Maintenance

PostgreSQL automatically maintains indexes. Monitor with:

```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;

-- Find unused indexes
SELECT schemaname, tablename, indexname
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public';

-- Check index bloat
SELECT schemaname, tablename, indexname,
       pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## Data Retention

### Current Policy

- **Pageviews:** 24 months (configurable via DATA_RETENTION_MONTHS env var)
- **Events:** Same as Pageviews (CASCADE delete)
- **Email Logs:** No automatic cleanup (audit trail)
- **Email Preferences:** No automatic cleanup (user configuration)

### Cleanup Job

Automated cleanup runs weekly via cron job:

**Job:** `cleanup-old-pageviews`

**Schedule:** Weekly (exact day/time TBD)

**Logic:**
```sql
DELETE FROM pageviews
WHERE added_iso < NOW() - INTERVAL '${DATA_RETENTION_MONTHS} months';
```

**Impact:**
- Events cascade deleted automatically
- Pageview statistics in reports may change
- Backup before running cleanup in production

---

## Database Constraints

### Primary Keys
- All models use `@default(cuid())` for unique, non-sequential IDs
- Prevents ID guessing attacks
- Sortable by creation time

### Foreign Keys
- All foreign keys indexed for query performance
- Cascade behaviors prevent orphaned data
- SET NULL on Pageview.website_id preserves analytics history

### Unique Constraints
- User.email - Prevents duplicate accounts
- Website.api_key - Security (unique API keys)
- BackupCode.code - Prevents duplicate codes

### NOT NULL Constraints
- Required fields enforced at database level
- Nullable fields explicitly marked with `?` in Prisma schema
- Application validation adds additional business logic layer

---

## Query Optimization Tips

### Common Queries

1. **Get pageviews for date range:**
```sql
SELECT * FROM pageviews
WHERE added_iso >= $1 AND added_iso < $2
  AND website_id = $3
ORDER BY added_iso DESC;
-- Uses: idx_pageviews_added_iso + idx_pageviews_website_id
```

2. **Get unique visitors:**
```sql
SELECT COUNT(DISTINCT visitor_hash) FROM pageviews
WHERE added_iso >= $1 AND added_iso < $2
  AND website_id = $3;
-- Uses: idx_pageviews_visitor_hash_added_iso
```

3. **Get email preferences:**
```sql
SELECT * FROM email_preferences
WHERE user_id = $1 AND (website_id = $2 OR website_id IS NULL);
-- Uses: idx_email_preferences_user_id
```

4. **Alert cooldown check:**
```sql
SELECT last_spike_triggered_at FROM email_preferences
WHERE website_id = $1 AND spike_alert_enabled = true;
-- Uses: idx_email_preferences_website_id
```

### Slow Query Detection

Enable `pg_stat_statements`:
```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 20;
```

---

## Backup and Recovery

### Backup Strategy

**Daily Automated Backups:**
- Full database dump via `pg_dump`
- Retained for 30 days
- Stored off-site (S3 or equivalent)

**Backup Command:**
```bash
pg_dump -U postgres -d my_analytics -F c -f backup_$(date +%Y%m%d).dump
```

**Restore Command:**
```bash
pg_restore -U postgres -d my_analytics -c backup_20251121.dump
```

### Point-in-Time Recovery

Configure WAL archiving in production:
```
wal_level = replica
archive_mode = on
archive_command = 'cp %p /path/to/archive/%f'
```

---

## Security Considerations

### Sensitive Data

1. **User.password** - Bcrypt hashed (never in plaintext)
2. **User.totp_secret** - AES-256-GCM encrypted
3. **BackupCode.code** - Bcrypt hashed
4. **Pageview.visitor_hash** - SHA-256 hashed (irreversible)

### Row-Level Security

Currently not implemented. All security enforced at application layer:
- All queries filtered by `user_id` from session
- No direct database access from client
- API authentication via NextAuth.js

### SQL Injection Prevention

- Prisma ORM uses parameterized queries (automatic protection)
- No raw SQL queries without parameters
- Input validation with Zod before database operations

---

## Schema Versioning

**Current Version:** 1.2

**Versioning Strategy:**
- Migrations tracked in `_prisma_migrations` table
- Each migration has unique timestamp and checksum
- Never modify applied migrations (create new migration instead)

**Schema Evolution:**
```
v1.0 - Initial schema (Pageview, Event, User)
v1.1 - MFA support (BackupCode, User.mfa_enabled)
v1.2 - Email features (Website, EmailPreference, EmailDeliveryLog)
```

---

## Prisma Client Usage

### Generating Client

```bash
npx prisma generate
```

Generates TypeScript types in `node_modules/@prisma/client`.

### Example Queries

```typescript
import { prisma } from '@/lib/db/client';

// Get user with backup codes
const user = await prisma.user.findUnique({
  where: { email: 'user@example.com' },
  include: { backupCodes: true },
});

// Get pageviews with events
const pageviews = await prisma.pageview.findMany({
  where: {
    added_iso: { gte: startDate, lt: endDate },
    website_id: websiteId,
  },
  include: { events: true },
  orderBy: { added_iso: 'desc' },
});

// Create email preference
const preference = await prisma.emailPreference.create({
  data: {
    userId: session.user.id,
    websiteId: 'website_123',
    reportSchedule: 'DAILY',
    reportEnabled: true,
  },
});
```

---

## References

- Prisma Docs: https://www.prisma.io/docs
- PostgreSQL Docs: https://www.postgresql.org/docs/17/
- Prisma Schema Reference: https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference

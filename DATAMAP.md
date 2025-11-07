# My Analytics - Data Model Map

**Project Type**: Privacy-focused, self-hosted web analytics platform
**Database**: PostgreSQL 17.6
**Cache Layer**: Redis 7.4
**ORM**: Prisma

---

## Table of Contents
1. [Entity Relationship Diagram](#entity-relationship-diagram)
2. [Database Tables](#database-tables)
3. [Redis Data Structures](#redis-data-structures)
4. [Data Flows](#data-flows)
5. [API Endpoints & Data Access](#api-endpoints--data-access)
6. [Indexes & Performance](#indexes--performance)
7. [Data Validation Rules](#data-validation-rules)
8. [Privacy & Security](#privacy--security)

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USERS                                    │
│─────────────────────────────────────────────────────────────────│
│ PK  id                 TEXT (CUID)                              │
│ UQ  email              VARCHAR(255)                             │
│     password           VARCHAR(255) [bcrypt hashed]             │
│     name               VARCHAR(255) [nullable]                  │
│     mfaEnabled         BOOLEAN [default: false]                 │
│     mfaSecret          VARCHAR(500) [encrypted, nullable]       │
│     createdAt          TIMESTAMPTZ(3)                           │
└─────────────────────────────────────────────────────────────────┘
                    │
                    │ 1:N CASCADE
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKUP_CODES                                │
│─────────────────────────────────────────────────────────────────│
│ PK  id                 TEXT (CUID)                              │
│ FK  userId             TEXT → users.id [CASCADE DELETE]          │
│     code               VARCHAR(255) [bcrypt hashed]             │
│     used               BOOLEAN [default: false]                 │
│     usedAt             TIMESTAMPTZ(3) [nullable]                │
│     createdAt          TIMESTAMPTZ(3)                           │
└─────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                        PAGEVIEWS                                 │
│─────────────────────────────────────────────────────────────────│
│ PK  id                 TEXT (CUID)                              │
│ UQ  page_id            TEXT (CUID client-generated)              │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ IDENTITY & TIMING (5 fields)                           │ │
│     │ • added_iso        TIMESTAMPTZ(3)                      │ │
│     │ • session_id       VARCHAR(255) [nullable]              │ │
│     │ • created_at       TIMESTAMPTZ(3)                      │ │
│     └─────────────────────────────────────────────────────────┘ │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ PAGE CONTEXT (6 fields)                                │ │
│     │ • hostname         VARCHAR(255)                         │ │
│     │ • path             VARCHAR(2000) [required]             │ │
│     │ • hash             VARCHAR(1000)                        │ │
│     │ • query_string     VARCHAR(2000)                        │ │
│     │ • document_title   VARCHAR(500)                         │ │
│     │ • document_referrer VARCHAR(2000)                       │ │
│     └─────────────────────────────────────────────────────────┘ │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ REFERRER ANALYTICS (2 fields)                          │ │
│     │ • referrer_domain  VARCHAR(255)                         │ │
│     │ • referrer_category VARCHAR(50) [Direct/Search/...]    │ │
│     └─────────────────────────────────────────────────────────┘ │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ VISITOR CLASSIFICATION (3 fields)                      │ │
│     │ • is_unique        BOOLEAN [default: false]             │ │
│     │ • is_bot           BOOLEAN [default: false]             │ │
│     │ • is_internal_referrer BOOLEAN [default: false]        │ │
│     └─────────────────────────────────────────────────────────┘ │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ DEVICE & BROWSER (10 fields)                           │ │
│     │ • device_type      DeviceType ENUM [required]           │ │
│     │ • browser_name     VARCHAR(100)                         │ │
│     │ • browser_version  VARCHAR(50)                          │ │
│     │ • browser_major_version VARCHAR(10)                     │ │
│     │ • os_name          VARCHAR(100)                         │ │
│     │ • os_version       VARCHAR(50)                          │ │
│     │ • viewport_width   INTEGER                              │ │
│     │ • viewport_height  INTEGER                              │ │
│     │ • screen_width     INTEGER                              │ │
│     │ • screen_height    INTEGER                              │ │
│     └─────────────────────────────────────────────────────────┘ │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ LOCALE & ENVIRONMENT (3 fields)                        │ │
│     │ • language         VARCHAR(10)                          │ │
│     │ • timezone         VARCHAR(100)                         │ │
│     │ • user_agent       VARCHAR(1000)                        │ │
│     └─────────────────────────────────────────────────────────┘ │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ GEOGRAPHIC (1 field)                                   │ │
│     │ • country_code     CHAR(2) [ISO 3166-1 alpha-2]        │ │
│     └─────────────────────────────────────────────────────────┘ │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ MARKETING ATTRIBUTION (5 fields)                       │ │
│     │ • utm_source       VARCHAR(255)                         │ │
│     │ • utm_medium       VARCHAR(255)                         │ │
│     │ • utm_campaign     VARCHAR(255)                         │ │
│     │ • utm_content      VARCHAR(255)                         │ │
│     │ • utm_term         VARCHAR(255)                         │ │
│     └─────────────────────────────────────────────────────────┘ │
│     ┌─────────────────────────────────────────────────────────┐ │
│     │ ENGAGEMENT METRICS (4 fields)                          │ │
│     │ • duration_seconds INTEGER [required]                   │ │
│     │ • time_on_page_seconds INTEGER                          │ │
│     │ • scrolled_percentage INTEGER [0-100]                   │ │
│     │ • visibility_changes INTEGER [default: 0]               │ │
│     └─────────────────────────────────────────────────────────┘ │
│                                                                  │
│ Total Fields: 36                                                 │
└─────────────────────────────────────────────────────────────────┘
                    │
                    │ 1:N SET NULL
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                          EVENTS                                  │
│─────────────────────────────────────────────────────────────────│
│ PK  id                 TEXT (CUID)                              │
│     event_name         VARCHAR(255) [required]                  │
│     event_metadata     JSONB [max 5KB, nullable]                │
│ FK  page_id            VARCHAR(255) → pageviews.page_id [SET NULL]│
│     session_id         VARCHAR(255) [nullable]                  │
│     timestamp          TIMESTAMPTZ(3) [default: now()]          │
│     path               VARCHAR(2000) [required]                 │
│     country_code       CHAR(2) [nullable]                       │
│                                                                  │
│ Total Fields: 8                                                  │
└─────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                       ENUMS & TYPES                              │
│─────────────────────────────────────────────────────────────────│
│ DeviceType: desktop | mobile | tablet                           │
│                                                                  │
│ Referrer Categories:                                             │
│   • Direct    - No referrer or internal navigation              │
│   • Search    - Search engines (Google, Bing, DuckDuckGo, etc.) │
│   • Social    - Social networks (Facebook, Twitter, etc.)       │
│   • External  - All other external domains                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Tables

### 1. Pageviews Table

**Purpose**: Core analytics table tracking all pageview events with comprehensive context

**36 Fields Organized by Category**:

#### Identity & Timing (5 fields)
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | TEXT | PK, CUID | Server-generated unique identifier |
| `page_id` | TEXT | UNIQUE, CUID | Client-generated unique page identifier |
| `added_iso` | TIMESTAMPTZ(3) | NOT NULL | Client-reported timestamp (ISO 8601) |
| `session_id` | VARCHAR(255) | Nullable | Visitor session identifier |
| `created_at` | TIMESTAMPTZ(3) | Default: now() | Server-side timestamp |

#### Page Context (6 fields)
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `hostname` | VARCHAR(255) | Nullable | Domain name (e.g., example.com) |
| `path` | VARCHAR(2000) | NOT NULL | URL pathname (e.g., /blog/post-1) |
| `hash` | VARCHAR(1000) | Nullable | URL fragment after # |
| `query_string` | VARCHAR(2000) | Nullable | URL query parameters |
| `document_title` | VARCHAR(500) | Nullable | Page title from HTML |
| `document_referrer` | VARCHAR(2000) | Nullable | Full referrer URL |

#### Referrer Analytics (2 fields)
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `referrer_domain` | VARCHAR(255) | Nullable | Extracted domain from referrer |
| `referrer_category` | VARCHAR(50) | Nullable | Direct/Search/Social/External |

#### Visitor Classification (3 fields)
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `is_unique` | BOOLEAN | Default: false | First visit of the day |
| `is_bot` | BOOLEAN | Default: false | Detected bot/crawler |
| `is_internal_referrer` | BOOLEAN | Default: false | Same-domain referrer |

#### Device & Browser (10 fields)
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `device_type` | DeviceType | ENUM, NOT NULL | desktop/mobile/tablet |
| `browser_name` | VARCHAR(100) | Nullable | Chrome, Firefox, Safari, etc. |
| `browser_version` | VARCHAR(50) | Nullable | Full version string |
| `browser_major_version` | VARCHAR(10) | Nullable | Major version only |
| `os_name` | VARCHAR(100) | Nullable | Windows, macOS, Linux, etc. |
| `os_version` | VARCHAR(50) | Nullable | OS version string |
| `viewport_width` | INTEGER | Nullable | Browser viewport width (px) |
| `viewport_height` | INTEGER | Nullable | Browser viewport height (px) |
| `screen_width` | INTEGER | Nullable | Physical screen width (px) |
| `screen_height` | INTEGER | Nullable | Physical screen height (px) |

#### Locale & Environment (3 fields)
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `language` | VARCHAR(10) | Nullable | Browser language (e.g., en-US) |
| `timezone` | VARCHAR(100) | Nullable | Timezone string (e.g., America/New_York) |
| `user_agent` | VARCHAR(1000) | Default: '' | Raw User-Agent header |

#### Geographic (1 field)
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `country_code` | CHAR(2) | Nullable | ISO 3166-1 alpha-2 country code |

#### Marketing Attribution (5 fields)
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `utm_source` | VARCHAR(255) | Nullable | Campaign source (e.g., google, newsletter) |
| `utm_medium` | VARCHAR(255) | Nullable | Campaign medium (e.g., cpc, email) |
| `utm_campaign` | VARCHAR(255) | Nullable | Campaign name |
| `utm_content` | VARCHAR(255) | Nullable | Ad content identifier |
| `utm_term` | VARCHAR(255) | Nullable | Paid search keywords |

#### Engagement Metrics (4 fields)
| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `duration_seconds` | INTEGER | NOT NULL | Time spent on page |
| `time_on_page_seconds` | INTEGER | Nullable | Active engagement time |
| `scrolled_percentage` | INTEGER | Nullable, 0-100 | Maximum scroll depth |
| `visibility_changes` | INTEGER | Default: 0 | Tab visibility change count |

**Indexes**: 10 composite indexes for optimized time-series queries

---

### 2. Events Table

**Purpose**: Custom event tracking with flexible JSONB metadata

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | TEXT | PK, CUID | Unique event identifier |
| `event_name` | VARCHAR(255) | NOT NULL | Event name (e.g., "button_click") |
| `event_metadata` | JSONB | Nullable, max 5KB | Custom event properties |
| `page_id` | VARCHAR(255) | FK → pageviews.page_id | Links to pageview (optional) |
| `session_id` | VARCHAR(255) | Nullable | Session identifier |
| `timestamp` | TIMESTAMPTZ(3) | Default: now() | Event occurrence time |
| `path` | VARCHAR(2000) | NOT NULL | URL path where event occurred |
| `country_code` | CHAR(2) | Nullable | ISO country code |

**Indexes**: 3 indexes for event name, session, and page_id lookups

---

### 3. Users Table

**Purpose**: Single-user authentication system with MFA support

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | TEXT | PK, CUID | User identifier |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | User email address |
| `password` | VARCHAR(255) | NOT NULL | Bcrypt hashed password (10 rounds) |
| `name` | VARCHAR(255) | Nullable | User's display name |
| `createdAt` | TIMESTAMPTZ(3) | Default: now() | Account creation timestamp |
| `mfaEnabled` | BOOLEAN | Default: false | MFA enrollment status |
| `mfaSecret` | VARCHAR(500) | Nullable | Encrypted TOTP secret key |

**Constraints**: Single-user system (enforced at application level)

---

### 4. Backup Codes Table

**Purpose**: MFA backup codes for account recovery

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | TEXT | PK, CUID | Backup code identifier |
| `userId` | TEXT | FK → users.id, CASCADE | Owner of the backup code |
| `code` | VARCHAR(255) | NOT NULL | Bcrypt hashed backup code |
| `used` | BOOLEAN | Default: false | Whether code has been used |
| `usedAt` | TIMESTAMPTZ(3) | Nullable | When code was used |
| `createdAt` | TIMESTAMPTZ(3) | Default: now() | Code generation timestamp |

**Relationship**: 1:N with users (CASCADE delete)

---

## Redis Data Structures

### 1. Session Tracking
```
Key: session:{sessionId}
Value: {
  "start_time": 1699123456000,
  "page_count": 5,
  "last_seen": 1699125678000,
  "initial_referrer": "https://google.com",
  "utm_params": { ... }
}
TTL: 24 hours (sliding window)
```

### 2. Unique Visitor Detection
```
Key: visitor:hash:{SHA256(IP + UserAgent + Date)}
Value: "1"
TTL: 24 hours (daily unique visitor)
```

### 3. Active Visitors
```
Key: visitor:activity:{visitorHash}
Value: timestamp
TTL: 5 minutes (real-time count)
```

---

## Data Flows

### 1. Pageview Tracking Flow
```
┌──────────┐    POST /api/metrics    ┌────────────────┐
│  Client  │ ──────────────────────> │   API Route    │
│ (Browser)│                          │                │
└──────────┘                          │ 1. Validate    │
     │                                │ 2. Parse UA    │
     │                                │ 3. Hash IP     │
     │                                │ 4. Check Redis │
     │                                │ 5. GeoIP       │
     │                                │ 6. Insert DB   │
     │                                └────┬──────┬────┘
     │                                     │      │
     │                                     ▼      ▼
     │                               ┌─────┐  ┌──────────┐
     │                               │Redis│  │PostgreSQL│
     │                               └─────┘  └──────────┘
     │
     │    POST /api/metrics/append
     └────────────────────────────────────────────>
          (Update engagement metrics)
```

### 2. Event Tracking Flow
```
┌──────────┐   POST /api/metrics/event   ┌────────────────┐
│  Client  │ ─────────────────────────> │   API Route    │
│ (Browser)│                             │                │
└──────────┘                             │ 1. Validate    │
                                         │ 2. GeoIP       │
                                         │ 3. Insert DB   │
                                         └────────┬───────┘
                                                  │
                                                  ▼
                                            ┌──────────┐
                                            │PostgreSQL│
                                            │ events   │
                                            └──────────┘
```

### 3. Authentication & MFA Flow
```
┌──────┐   Login    ┌────────┐   Check MFA   ┌──────────┐
│ User │ ────────> │NextAuth│ ─────────────> │PostgreSQL│
└──────┘            └────┬───┘                └──────────┘
    │                    │
    │   IF mfaEnabled    │
    │ <──────────────────┘
    │
    │   POST /api/auth/mfa/verify
    └─────────────────────────────>
         (6-digit TOTP or backup code)
```

### 4. Dashboard Data Aggregation
```
┌───────────┐   GET /api/top-pages   ┌────────────────┐
│ Dashboard │ ────────────────────> │   API Route    │
│    UI     │                        │  + Auth Check  │
└───────────┘                        └────────┬───────┘
     ▲                                        │
     │                                        │ SQL:
     │                                        │ SELECT path,
     │      JSON Response                     │   COUNT(*) as pageviews,
     └────────────────────────────────────────┤   COUNT(DISTINCT session_id)
                                              │ GROUP BY path
                                              │ ORDER BY pageviews DESC
                                              ▼
                                        ┌──────────┐
                                        │PostgreSQL│
                                        │pageviews │
                                        └──────────┘
```

---

## API Endpoints & Data Access

### Public Endpoints (No Authentication)

| Endpoint | Method | Purpose | Data Written |
|----------|--------|---------|--------------|
| `/api/metrics` | POST | Record pageview | `pageviews` table, Redis sessions |
| `/api/metrics` | GET | Beacon fallback | `pageviews` table |
| `/api/metrics/append` | POST | Update engagement | `pageviews.duration_seconds`, `scrolled_percentage` |
| `/api/metrics/event` | POST | Custom events | `events` table |

### Protected Endpoints (Requires Authentication + MFA)

| Endpoint | Method | Purpose | Data Read |
|----------|--------|---------|-----------|
| `/api/top-pages` | GET | Page analytics | `pageviews` (aggregated) |
| `/api/active-visitors` | GET | Real-time count | Redis `visitor:activity:*` |
| `/api/referrer-urls` | GET | Referrer drill-down | `pageviews.document_referrer` |

### Authentication Endpoints

| Endpoint | Method | Purpose | Data Accessed |
|----------|--------|---------|---------------|
| `/api/auth/register` | POST | User registration | `users` table (INSERT) |
| `/api/auth/[...nextauth]` | POST/GET | Login/logout | `users` table (SELECT) |

### MFA Endpoints

| Endpoint | Method | Purpose | Data Accessed |
|----------|--------|---------|---------------|
| `/api/auth/mfa/setup` | POST | Generate TOTP secret | N/A (in-memory) |
| `/api/auth/mfa/verify-setup` | POST | Confirm MFA enrollment | `users.mfaSecret`, `backup_codes` |
| `/api/auth/mfa/verify` | POST | Verify TOTP/backup code | `users.mfaSecret`, `backup_codes` |
| `/api/auth/mfa/backup-codes` | GET | Regenerate codes | `backup_codes` (DELETE + INSERT) |

---

## Indexes & Performance

### Primary Indexes (11 total)

#### Pageviews Table (10 indexes)
1. **`idx_pageviews_timestamp`** ON (`added_iso`)
   - Purpose: Time-range queries
   - Used by: Dashboard date filtering

2. **`idx_pageviews_path_timestamp`** ON (`path`, `added_iso`)
   - Purpose: Per-page analytics over time
   - Used by: Top pages, page-specific reports

3. **`idx_pageviews_country_timestamp`** ON (`country_code`, `added_iso`)
   - Purpose: Geographic analytics
   - Used by: Country breakdowns

4. **`idx_pageviews_session_timestamp`** ON (`session_id`, `added_iso`)
   - Purpose: Session-based analytics
   - Used by: Session tracking, bounce rate

5. **`idx_pageviews_session_id`** ON (`session_id`)
   - Purpose: Fast session lookups
   - Used by: Active sessions

6. **`idx_pageviews_is_bot`** ON (`is_bot`)
   - Purpose: Bot filtering
   - Used by: Exclude bots from analytics

7. **`idx_pageviews_referrer_domain`** ON (`referrer_domain`, `added_iso`)
   - Purpose: Referrer source analysis
   - Used by: Traffic sources report

8. **`idx_pageviews_referrer_category`** ON (`referrer_category`, `added_iso`)
   - Purpose: Referrer category analysis
   - Used by: Direct/Search/Social breakdown

9. **`idx_pageviews_device_timestamp`** ON (`device_type`, `added_iso`)
   - Purpose: Device analytics
   - Used by: Desktop vs mobile reports

10. **`idx_pageviews_browser_timestamp`** ON (`browser_name`, `added_iso`)
    - Purpose: Browser analytics
    - Used by: Browser compatibility insights

#### Events Table (3 indexes)
1. **`idx_events_name_timestamp`** ON (`event_name`, `timestamp`)
   - Purpose: Event-specific time-series queries

2. **`idx_events_session_timestamp`** ON (`session_id`, `timestamp`)
   - Purpose: Session-based event tracking

3. **`idx_events_page_id`** ON (`page_id`)
   - Purpose: Link events to pageviews

#### Users Table (1 index)
1. **`idx_users_email`** ON (`email`)
   - Purpose: Fast authentication lookups

#### Backup Codes Table (1 index)
1. **`idx_backup_codes_user_id`** ON (`userId`)
   - Purpose: Fast user code retrieval

---

## Data Validation Rules

### Pageview Payload Validation (Zod)
```typescript
{
  page_id: /^c[a-z0-9]{24}$/,  // CUID format
  added_iso: ISO 8601 datetime,
  path: min(1) max(2000) startsWith("/"),
  device_type: "desktop" | "mobile" | "tablet",
  duration_seconds: int().nonnegative(),
  scrolled_percentage: int().min(0).max(100),
  country_code: length(2),
  utm_*: max(255),
  viewport_*: int().positive(),
  screen_*: int().positive()
}
```

### Event Payload Validation
```typescript
{
  event_name: max(255) required,
  event_metadata: JSONB max(5KB),
  path: max(2000) required,
  session_id: max(255) required
}
```

### Authentication Validation
```typescript
{
  email: email() max(255) lowercase() trim(),
  password: min(8) max(128),
  name: max(255) optional
}
```

### MFA Validation
```typescript
{
  token: /^\d{6}$/,          // 6-digit TOTP
  backupCode: /^[A-Z0-9]{8}$/ // 8-char alphanumeric
}
```

---

## Privacy & Security

### Privacy Features
- **No Cookies**: Pure server-side tracking
- **IP Hashing**: SHA-256 with daily salt, never stored
- **Country-Level GeoIP**: No city or precise location
- **Anonymous Sessions**: No PII in session data
- **GDPR-Friendly**: No personal data collection

### Security Measures
- **Bcrypt Password Hashing**: 10 rounds
- **TOTP MFA**: Time-based one-time passwords
- **Backup Codes**: 10 single-use recovery codes (bcrypt hashed)
- **JWT Sessions**: 30-day expiration
- **Input Validation**: Zod schemas on all endpoints
- **SQL Injection Prevention**: Prisma parameterized queries
- **Bot Detection**: isbot library integration
- **CORS Configuration**: Controlled cross-origin access

---

## Schema Statistics

| Metric | Count |
|--------|-------|
| **Total Tables** | 4 |
| **Total Fields** | 57 |
| **Total Indexes** | 16 |
| **Foreign Keys** | 2 |
| **Enums** | 1 |
| **Unique Constraints** | 2 |

### Field Distribution by Table
- **Pageviews**: 36 fields (63% of total)
- **Events**: 8 fields (14%)
- **Users**: 7 fields (12%)
- **Backup Codes**: 6 fields (11%)

---

## Migration History

1. **20251023201505**: Initial pageviews table (9 fields)
2. **20251023201745**: Add users table
3. **20251024084027**: Expand to 36-field pageviews + events table
4. **20251024171147**: Add referrer analytics fields
5. **20251024180000**: Add browser_major_version + analytics indexes
6. **20251026183142**: Remove unique constraint on page_id
7. **20251105190852**: Add MFA support (mfaEnabled, mfaSecret, backup_codes)

---

**Last Updated**: 2025-11-07
**Schema Version**: PostgreSQL 17.6
**Prisma Version**: Latest

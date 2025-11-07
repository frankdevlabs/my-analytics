# Data Model Enrichment Suggestions

**Project**: My Analytics
**Date**: 2025-11-07
**Current State**: Strong foundation with 36-field pageview tracking, custom events, and MFA authentication

---

## Executive Summary

The current data model provides excellent foundational analytics with strong privacy features. This document outlines 15 strategic areas for enrichment that would transform My Analytics from a robust pageview tracker into a comprehensive web analytics platform capable of competing with enterprise solutions.

**Priority Tiers**:
- 🔴 **High Priority**: Significant user value, relatively easy implementation
- 🟡 **Medium Priority**: Valuable features, moderate complexity
- 🟢 **Low Priority**: Nice-to-have, can wait for v2.0

---

## 1. Performance Metrics (Core Web Vitals) 🔴

### Current State
No performance metrics tracked. You know *what* users visit but not *how fast* it loads.

### Proposed Enhancement

#### Add to `pageviews` table:
```sql
-- Page Load Performance
dom_content_loaded_ms    INTEGER,  -- DOMContentLoaded timing
page_load_ms             INTEGER,  -- Full page load timing
first_paint_ms           INTEGER,  -- First Paint timing
first_contentful_paint_ms INTEGER, -- FCP timing

-- Core Web Vitals (Google's key metrics)
largest_contentful_paint_ms INTEGER, -- LCP (loading performance)
first_input_delay_ms     INTEGER,     -- FID (interactivity)
cumulative_layout_shift  DECIMAL(5,4), -- CLS (visual stability, 0.0000-9.9999)
time_to_first_byte_ms    INTEGER,     -- TTFB (server response)
interaction_to_next_paint_ms INTEGER, -- INP (new Core Web Vital)

-- Resource Loading
resource_count           INTEGER,  -- Number of resources loaded
transfer_size_bytes      BIGINT,   -- Total transfer size
```

#### Indexes:
```sql
CREATE INDEX idx_pageviews_lcp_timestamp ON pageviews(largest_contentful_paint_ms, added_iso);
CREATE INDEX idx_pageviews_performance_path ON pageviews(path, largest_contentful_paint_ms);
```

### Benefits
- Identify slow pages impacting SEO
- Correlate performance with bounce rates
- Meet Google's page experience requirements
- Optimize user experience based on real data

### Implementation Effort
**Medium** - Requires JavaScript Performance API integration in tracker

---

## 2. User Journey & Path Analysis 🔴

### Current State
You track individual pageviews but not the path users take through your site.

### Proposed Enhancement

#### New table: `user_paths`
```sql
CREATE TABLE user_paths (
  id                TEXT PRIMARY KEY,
  session_id        VARCHAR(255) NOT NULL,
  path_sequence     INTEGER NOT NULL,        -- 1, 2, 3...
  page_id           TEXT,                    -- FK to pageviews
  path              VARCHAR(2000) NOT NULL,
  entry_timestamp   TIMESTAMPTZ(3) NOT NULL,
  exit_timestamp    TIMESTAMPTZ(3),
  time_spent_ms     INTEGER,
  exit_type         VARCHAR(50),             -- navigation, bounce, exit
  next_path         VARCHAR(2000),

  FOREIGN KEY (page_id) REFERENCES pageviews(page_id) ON DELETE SET NULL,
  FOREIGN KEY (session_id) REFERENCES pageviews(session_id) ON DELETE CASCADE
);

CREATE INDEX idx_user_paths_session ON user_paths(session_id, path_sequence);
CREATE INDEX idx_user_paths_path ON user_paths(path, entry_timestamp);
```

#### Add to `pageviews` table:
```sql
entry_page           BOOLEAN DEFAULT FALSE,  -- First page in session
exit_page            BOOLEAN DEFAULT FALSE,  -- Last page in session
pages_in_session     INTEGER,                -- Total pages viewed this session
session_duration_ms  INTEGER,                -- Total session length
```

### Benefits
- Visualize user flows (Sankey diagrams)
- Identify drop-off points in funnels
- Optimize navigation structure
- Calculate accurate bounce rates (single-page sessions)
- Measure content effectiveness by position in journey

### Implementation Effort
**Medium-High** - Requires session reconstruction logic

---

## 3. Engagement Scoring & Interactions 🔴

### Current State
Limited engagement tracking (scroll depth, time on page). No click tracking or content interaction metrics.

### Proposed Enhancement

#### New table: `interactions`
```sql
CREATE TABLE interactions (
  id                TEXT PRIMARY KEY,
  page_id           TEXT NOT NULL,           -- FK to pageviews
  session_id        VARCHAR(255) NOT NULL,
  interaction_type  VARCHAR(50) NOT NULL,    -- click, hover, scroll_stop, copy, form_interaction
  element_selector  VARCHAR(500),            -- CSS selector or element ID
  element_text      VARCHAR(500),            -- Button/link text
  element_position  JSONB,                   -- {x: 100, y: 200}
  timestamp         TIMESTAMPTZ(3) NOT NULL,
  metadata          JSONB,

  FOREIGN KEY (page_id) REFERENCES pageviews(page_id) ON DELETE CASCADE
);

CREATE INDEX idx_interactions_page_id ON interactions(page_id);
CREATE INDEX idx_interactions_type_timestamp ON interactions(interaction_type, timestamp);
CREATE INDEX idx_interactions_selector ON interactions(element_selector, timestamp);
```

#### Add to `pageviews` table:
```sql
-- Engagement Scoring
click_count          INTEGER DEFAULT 0,
active_time_ms       INTEGER,                -- Time actively engaged (not idle)
idle_time_ms         INTEGER,                -- Time idle
rage_clicks          INTEGER DEFAULT 0,      -- Rapid repeated clicks (frustration indicator)
copy_events          INTEGER DEFAULT 0,      -- Text copied
engagement_score     DECIMAL(5,2),           -- 0-100 calculated score
```

### Benefits
- Identify most engaging content elements
- Detect user frustration (rage clicks)
- Optimize CTA button placement
- Calculate true engagement vs passive time
- Heatmap data for visual analysis

### Implementation Effort
**Medium** - Requires event listeners in tracker

---

## 4. Conversion Tracking & Goals 🟡

### Current State
No conversion or goal tracking. You can't measure if users complete desired actions.

### Proposed Enhancement

#### New table: `goals`
```sql
CREATE TABLE goals (
  id                TEXT PRIMARY KEY,
  name              VARCHAR(255) NOT NULL,
  description       TEXT,
  type              VARCHAR(50) NOT NULL,    -- page_view, event, duration, scroll_depth
  conditions        JSONB NOT NULL,          -- {path: "/thank-you", event_name: "purchase"}
  value             DECIMAL(10,2),           -- Monetary value
  created_at        TIMESTAMPTZ(3) DEFAULT now(),
  active            BOOLEAN DEFAULT TRUE
);
```

#### New table: `conversions`
```sql
CREATE TABLE conversions (
  id                TEXT PRIMARY KEY,
  goal_id           TEXT NOT NULL,
  session_id        VARCHAR(255) NOT NULL,
  page_id           TEXT,
  timestamp         TIMESTAMPTZ(3) NOT NULL,
  value             DECIMAL(10,2),
  attribution_data  JSONB,                   -- UTM params, referrer, etc.

  FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
  FOREIGN KEY (page_id) REFERENCES pageviews(page_id) ON DELETE SET NULL
);

CREATE INDEX idx_conversions_goal_timestamp ON conversions(goal_id, timestamp);
CREATE INDEX idx_conversions_session ON conversions(session_id, timestamp);
```

#### Add to `pageviews` table:
```sql
converted            BOOLEAN DEFAULT FALSE,
conversion_goal_ids  TEXT[],                 -- Array of goal IDs converted on this page
conversion_value     DECIMAL(10,2),
```

### Benefits
- Track business objectives (signups, purchases, downloads)
- Calculate conversion rates by traffic source
- ROI measurement for marketing campaigns
- Multi-touch attribution
- A/B test effectiveness measurement

### Implementation Effort
**Medium** - Requires goal definition UI + matching logic

---

## 5. Form Analytics 🟡

### Current State
No form interaction tracking. Forms are critical conversion points that are currently invisible.

### Proposed Enhancement

#### New table: `form_interactions`
```sql
CREATE TABLE form_interactions (
  id                TEXT PRIMARY KEY,
  page_id           TEXT NOT NULL,
  session_id        VARCHAR(255) NOT NULL,
  form_id           VARCHAR(255),            -- HTML form ID or name
  form_name         VARCHAR(255),

  -- Interaction tracking
  started_at        TIMESTAMPTZ(3),
  submitted_at      TIMESTAMPTZ(3),
  abandoned_at      TIMESTAMPTZ(3),

  -- Engagement metrics
  fields_total      INTEGER,
  fields_interacted INTEGER,
  fields_completed  INTEGER,
  time_to_first_field_ms INTEGER,
  time_to_submit_ms INTEGER,

  -- Field-level data
  field_interactions JSONB,                  -- Array of {field_name, time_spent_ms, changes_count}

  -- Outcome
  status            VARCHAR(50),             -- started, abandoned, submitted, error
  error_messages    TEXT[],

  FOREIGN KEY (page_id) REFERENCES pageviews(page_id) ON DELETE CASCADE
);

CREATE INDEX idx_form_interactions_page_id ON form_interactions(page_id);
CREATE INDEX idx_form_interactions_status ON form_interactions(status, submitted_at);
```

### Benefits
- Identify problematic form fields causing abandonment
- Measure form completion rates
- Optimize form length and field order
- Detect validation issues
- Improve conversion on key forms (signup, checkout, contact)

### Implementation Effort
**Medium-High** - Requires sensitive data filtering to maintain privacy

---

## 6. Error & Exception Tracking 🔴

### Current State
No error tracking. You're blind to JavaScript errors affecting user experience.

### Proposed Enhancement

#### New table: `errors`
```sql
CREATE TABLE errors (
  id                TEXT PRIMARY KEY,
  page_id           TEXT,
  session_id        VARCHAR(255),

  -- Error details
  error_type        VARCHAR(100) NOT NULL,   -- javascript, network, console
  error_message     TEXT NOT NULL,
  error_stack       TEXT,

  -- Context
  source_file       VARCHAR(500),
  line_number       INTEGER,
  column_number     INTEGER,

  -- Environment
  browser_name      VARCHAR(100),
  browser_version   VARCHAR(50),
  os_name           VARCHAR(100),

  -- Frequency
  occurrence_count  INTEGER DEFAULT 1,
  first_seen        TIMESTAMPTZ(3) NOT NULL,
  last_seen         TIMESTAMPTZ(3) NOT NULL,

  -- Status
  resolved          BOOLEAN DEFAULT FALSE,
  resolved_at       TIMESTAMPTZ(3),

  FOREIGN KEY (page_id) REFERENCES pageviews(page_id) ON DELETE SET NULL
);

CREATE INDEX idx_errors_type_last_seen ON errors(error_type, last_seen);
CREATE INDEX idx_errors_message ON errors(error_message, last_seen);
CREATE INDEX idx_errors_page_id ON errors(page_id);
```

#### Add to `pageviews` table:
```sql
had_errors           BOOLEAN DEFAULT FALSE,
error_count          INTEGER DEFAULT 0,
```

### Benefits
- Proactive bug detection
- Prioritize fixes by user impact
- Correlate errors with browser/OS versions
- Improve stability and user experience
- Reduce support tickets

### Implementation Effort
**Low-Medium** - Global error handlers + network monitoring

---

## 7. A/B Testing & Experimentation 🟡

### Current State
No built-in A/B testing support. External tools required.

### Proposed Enhancement

#### New table: `experiments`
```sql
CREATE TABLE experiments (
  id                TEXT PRIMARY KEY,
  name              VARCHAR(255) NOT NULL,
  description       TEXT,

  -- Configuration
  status            VARCHAR(50) DEFAULT 'draft', -- draft, running, paused, completed
  traffic_allocation DECIMAL(3,2) DEFAULT 1.00,  -- 0.00-1.00 (percentage of traffic)

  -- Variants
  variants          JSONB NOT NULL,              -- [{id: "A", name: "Control", allocation: 0.5}, ...]

  -- Targeting
  targeting_rules   JSONB,                       -- {paths: ["/landing"], countries: ["US"], devices: ["mobile"]}

  -- Timing
  started_at        TIMESTAMPTZ(3),
  ended_at          TIMESTAMPTZ(3),
  created_at        TIMESTAMPTZ(3) DEFAULT now()
);
```

#### New table: `experiment_assignments`
```sql
CREATE TABLE experiment_assignments (
  id                TEXT PRIMARY KEY,
  experiment_id     TEXT NOT NULL,
  session_id        VARCHAR(255) NOT NULL,
  variant_id        VARCHAR(50) NOT NULL,
  assigned_at       TIMESTAMPTZ(3) NOT NULL,

  FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
);

CREATE INDEX idx_experiment_assignments_experiment ON experiment_assignments(experiment_id, assigned_at);
CREATE INDEX idx_experiment_assignments_session ON experiment_assignments(session_id);
```

#### Add to `pageviews` table:
```sql
experiment_ids    TEXT[],                    -- Array of active experiment IDs
variant_ids       TEXT[],                    -- Array of assigned variant IDs
```

#### Add to `conversions` table:
```sql
experiment_id     TEXT,
variant_id        TEXT,
```

### Benefits
- Built-in A/B testing without third-party tools
- Statistical significance calculations
- Multi-variant testing (A/B/C/D...)
- Automatic traffic splitting
- Conversion rate comparison by variant

### Implementation Effort
**High** - Requires experiment UI, assignment logic, and statistical analysis

---

## 8. Site Search Analytics 🟡

### Current State
No specific site search tracking (though query strings are captured).

### Proposed Enhancement

#### New table: `site_searches`
```sql
CREATE TABLE site_searches (
  id                TEXT PRIMARY KEY,
  session_id        VARCHAR(255) NOT NULL,
  page_id           TEXT,

  -- Search details
  query             VARCHAR(500) NOT NULL,
  normalized_query  VARCHAR(500),            -- Lowercase, trimmed
  results_count     INTEGER,

  -- Context
  search_location   VARCHAR(255),            -- header, sidebar, page
  timestamp         TIMESTAMPTZ(3) NOT NULL,

  -- Engagement
  clicked_result    BOOLEAN DEFAULT FALSE,
  clicked_position  INTEGER,
  clicked_url       VARCHAR(2000),
  refined_search    BOOLEAN DEFAULT FALSE,   -- User searched again

  FOREIGN KEY (page_id) REFERENCES pageviews(page_id) ON DELETE SET NULL
);

CREATE INDEX idx_site_searches_query ON site_searches(normalized_query, timestamp);
CREATE INDEX idx_site_searches_session ON site_searches(session_id, timestamp);
```

### Benefits
- Understand what users are looking for
- Identify content gaps (high-volume queries with no clicks)
- Improve search algorithm based on engagement
- Discover trending topics
- Optimize content strategy

### Implementation Effort
**Medium** - Requires search event tracking + result interaction monitoring

---

## 9. Multi-Site & Project Support 🟡

### Current State
Single-site analytics. No way to track multiple websites or projects.

### Proposed Enhancement

#### New table: `projects`
```sql
CREATE TABLE projects (
  id                TEXT PRIMARY KEY,
  name              VARCHAR(255) NOT NULL,
  domain            VARCHAR(255) NOT NULL,

  -- Configuration
  timezone          VARCHAR(100) DEFAULT 'UTC',
  currency          CHAR(3) DEFAULT 'USD',

  -- Settings
  track_subdomains  BOOLEAN DEFAULT TRUE,
  exclude_paths     TEXT[],
  bot_filtering     BOOLEAN DEFAULT TRUE,

  -- Access
  public_dashboard  BOOLEAN DEFAULT FALSE,
  share_token       VARCHAR(255),            -- For sharing dashboards

  created_at        TIMESTAMPTZ(3) DEFAULT now(),
  updated_at        TIMESTAMPTZ(3) DEFAULT now()
);

CREATE UNIQUE INDEX idx_projects_domain ON projects(domain);
```

#### Update existing tables:
Add `project_id TEXT REFERENCES projects(id)` to:
- `pageviews`
- `events`
- `goals`
- `experiments`

#### New table: `project_users` (for multi-user support)
```sql
CREATE TABLE project_users (
  id                TEXT PRIMARY KEY,
  project_id        TEXT NOT NULL,
  user_id           TEXT NOT NULL,
  role              VARCHAR(50) DEFAULT 'viewer', -- admin, editor, viewer
  created_at        TIMESTAMPTZ(3) DEFAULT now(),

  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(project_id, user_id)
);
```

### Benefits
- Track multiple websites from one dashboard
- Agency/client management
- Isolated data per project
- Shared dashboard links
- Project-specific settings

### Implementation Effort
**High** - Requires significant schema migration + multi-tenancy logic

---

## 10. Custom Dimensions & Segments 🟢

### Current State
Fixed schema. No way to add custom business-specific dimensions.

### Proposed Enhancement

#### New table: `custom_dimensions`
```sql
CREATE TABLE custom_dimensions (
  id                TEXT PRIMARY KEY,
  project_id        TEXT NOT NULL,
  name              VARCHAR(255) NOT NULL,
  key               VARCHAR(100) NOT NULL,   -- Used in API: cd_user_type
  scope             VARCHAR(50) NOT NULL,    -- pageview, session, user
  data_type         VARCHAR(50) DEFAULT 'string', -- string, number, boolean, date

  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  UNIQUE(project_id, key)
);
```

#### Add to `pageviews` table:
```sql
custom_dimensions JSONB,                     -- {cd_user_type: "premium", cd_plan: "pro"}
```

#### New table: `segments`
```sql
CREATE TABLE segments (
  id                TEXT PRIMARY KEY,
  project_id        TEXT NOT NULL,
  name              VARCHAR(255) NOT NULL,
  description       TEXT,

  -- Segment rules (stored as JSON)
  rules             JSONB NOT NULL,          -- {conditions: [{field: "country_code", operator: "equals", value: "US"}]}

  created_at        TIMESTAMPTZ(3) DEFAULT now(),
  created_by        TEXT,

  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

### Benefits
- Track business-specific attributes (user type, subscription level, etc.)
- Create reusable audience segments
- Filter all reports by custom segments
- Flexible schema for unique use cases
- Competitor feature parity (GA4 custom dimensions)

### Implementation Effort
**Medium-High** - Requires UI for dimension management + query builder

---

## 11. Aggregated Analytics Tables (Performance) 🟡

### Current State
All queries run against raw `pageviews` table. Slow for large datasets.

### Proposed Enhancement

#### New table: `daily_aggregates`
```sql
CREATE TABLE daily_aggregates (
  id                TEXT PRIMARY KEY,
  project_id        TEXT,
  date              DATE NOT NULL,

  -- Dimensions
  path              VARCHAR(2000),
  country_code      CHAR(2),
  device_type       VARCHAR(50),
  browser_name      VARCHAR(100),
  referrer_domain   VARCHAR(255),
  referrer_category VARCHAR(50),

  -- Metrics
  pageviews         INTEGER DEFAULT 0,
  unique_visitors   INTEGER DEFAULT 0,
  sessions          INTEGER DEFAULT 0,

  -- Engagement
  avg_duration_seconds DECIMAL(10,2),
  avg_scroll_percentage DECIMAL(5,2),
  bounce_rate       DECIMAL(5,4),

  -- Performance
  avg_load_time_ms  INTEGER,

  created_at        TIMESTAMPTZ(3) DEFAULT now(),

  UNIQUE(date, project_id, path, country_code, device_type)
);

CREATE INDEX idx_daily_aggregates_date ON daily_aggregates(date, project_id);
CREATE INDEX idx_daily_aggregates_path ON daily_aggregates(project_id, path, date);
```

#### Scheduled job:
```sql
-- Run nightly to aggregate previous day's data
INSERT INTO daily_aggregates (date, project_id, path, pageviews, unique_visitors, ...)
SELECT
  DATE(added_iso),
  project_id,
  path,
  COUNT(*) as pageviews,
  COUNT(DISTINCT session_id) as unique_visitors,
  ...
FROM pageviews
WHERE DATE(added_iso) = CURRENT_DATE - INTERVAL '1 day'
GROUP BY DATE(added_iso), project_id, path, ...;
```

### Benefits
- 10-100x faster dashboard queries
- Reduced database load
- Pre-calculated metrics (bounce rate, avg times)
- Historical data access without full table scans
- Cost savings on database resources

### Implementation Effort
**Medium** - Requires background job + query refactoring

---

## 12. Data Retention & Archival 🟢

### Current State
Unlimited data retention. Database will grow indefinitely.

### Proposed Enhancement

#### New table: `data_retention_policies`
```sql
CREATE TABLE data_retention_policies (
  id                TEXT PRIMARY KEY,
  project_id        TEXT NOT NULL,

  -- Retention periods (in days)
  raw_data_days     INTEGER DEFAULT 90,      -- Keep raw pageviews for 90 days
  aggregated_days   INTEGER DEFAULT 730,     -- Keep aggregates for 2 years

  -- Archive settings
  archive_enabled   BOOLEAN DEFAULT FALSE,
  archive_location  VARCHAR(500),            -- S3 bucket, etc.

  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

#### Add to tables:
```sql
-- Add to pageviews, events, etc.
archived          BOOLEAN DEFAULT FALSE,
archived_at       TIMESTAMPTZ(3),
```

#### Scheduled jobs:
1. **Archival Job**: Move old raw data to cold storage (S3, etc.)
2. **Deletion Job**: Delete data past retention period
3. **Aggregate Preservation**: Keep aggregates longer than raw data

### Benefits
- Control database costs
- Comply with data regulations (GDPR right to deletion)
- Faster queries (smaller active dataset)
- Historical trend analysis via aggregates
- Configurable per project

### Implementation Effort
**Medium** - Requires background jobs + archive infrastructure

---

## 13. Real-Time Alerts & Anomaly Detection 🟢

### Current State
No alerting. You discover issues reactively.

### Proposed Enhancement

#### New table: `alerts`
```sql
CREATE TABLE alerts (
  id                TEXT PRIMARY KEY,
  project_id        TEXT NOT NULL,
  name              VARCHAR(255) NOT NULL,

  -- Alert conditions
  metric            VARCHAR(100) NOT NULL,   -- pageviews, conversions, error_rate, etc.
  condition         VARCHAR(50) NOT NULL,    -- exceeds, drops_below, changes_by
  threshold         DECIMAL(10,2) NOT NULL,
  time_window       INTEGER DEFAULT 60,      -- Minutes

  -- Notification
  enabled           BOOLEAN DEFAULT TRUE,
  notification_channels JSONB,               -- {email: ["admin@example.com"], webhook: "..."}

  -- State
  last_triggered    TIMESTAMPTZ(3),
  trigger_count     INTEGER DEFAULT 0,

  created_at        TIMESTAMPTZ(3) DEFAULT now(),

  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

#### New table: `alert_history`
```sql
CREATE TABLE alert_history (
  id                TEXT PRIMARY KEY,
  alert_id          TEXT NOT NULL,
  triggered_at      TIMESTAMPTZ(3) NOT NULL,
  metric_value      DECIMAL(10,2) NOT NULL,
  threshold_value   DECIMAL(10,2) NOT NULL,
  resolved_at       TIMESTAMPTZ(3),

  FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE
);
```

### Alert Examples:
- Traffic drops by 50% in 1 hour
- Error rate exceeds 5%
- No pageviews received in 15 minutes (downtime)
- Conversion rate drops below 2%
- Page load time exceeds 3 seconds

### Benefits
- Proactive issue detection
- Downtime notifications
- Performance degradation alerts
- Traffic spike/drop notifications
- Anomaly detection (ML-powered)

### Implementation Effort
**High** - Requires background monitoring + notification system

---

## 14. Referrer Spam & Bot Filtering Enhancement 🟡

### Current State
Basic bot detection with isbot library. No referrer spam filtering.

### Proposed Enhancement

#### New table: `blocked_referrers`
```sql
CREATE TABLE blocked_referrers (
  id                TEXT PRIMARY KEY,
  project_id        TEXT,                    -- NULL = global
  domain_pattern    VARCHAR(255) NOT NULL,   -- Supports wildcards
  reason            VARCHAR(100),            -- spam, bot, testing
  auto_detected     BOOLEAN DEFAULT FALSE,
  blocked_at        TIMESTAMPTZ(3) DEFAULT now(),

  UNIQUE(project_id, domain_pattern)
);
```

#### Add to `pageviews` table:
```sql
is_spam           BOOLEAN DEFAULT FALSE,
spam_score        DECIMAL(3,2),              -- 0.00-1.00 confidence
bot_type          VARCHAR(50),               -- crawler, scraper, social_bot, monitoring
```

#### Enhanced bot detection:
- **Pattern matching**: Known spam domains (semalt, buttons-for-website, etc.)
- **Behavioral analysis**: Impossible navigation speeds, no engagement
- **IP reputation**: Check against spam databases
- **User-Agent analysis**: Suspicious patterns
- **Referrer validation**: Check if referrer domain exists

### Benefits
- Cleaner analytics data
- Accurate traffic attribution
- Remove fake referral traffic
- Identify and block scrapers
- Better data quality

### Implementation Effort
**Medium** - Requires spam database + heuristic rules

---

## 15. Session Replay (Privacy-Respecting) 🟢

### Current State
No session replay capabilities. You see metrics but not user behavior.

### Proposed Enhancement

#### New table: `session_replays`
```sql
CREATE TABLE session_replays (
  id                TEXT PRIMARY KEY,
  session_id        VARCHAR(255) NOT NULL UNIQUE,
  project_id        TEXT NOT NULL,

  -- Recording metadata
  started_at        TIMESTAMPTZ(3) NOT NULL,
  ended_at          TIMESTAMPTZ(3),
  duration_ms       INTEGER,

  -- Storage
  recording_data    JSONB,                   -- Compressed event stream
  storage_url       VARCHAR(500),            -- S3 for large recordings

  -- Context
  device_type       VARCHAR(50),
  browser_name      VARCHAR(100),
  country_code      CHAR(2),

  -- Privacy
  pii_masked        BOOLEAN DEFAULT TRUE,
  consent_given     BOOLEAN DEFAULT FALSE,

  -- Status
  has_errors        BOOLEAN DEFAULT FALSE,
  has_rage_clicks   BOOLEAN DEFAULT FALSE,
  has_conversions   BOOLEAN DEFAULT FALSE,

  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_session_replays_session ON session_replays(session_id);
CREATE INDEX idx_session_replays_project_date ON session_replays(project_id, started_at);
```

#### Privacy features:
- Mask all text input by default
- Redact email/phone/credit card patterns
- Blur images with PII detection
- Opt-in recording only
- GDPR-compliant consent management
- Automatic data deletion after 30 days

### Benefits
- See exactly what users experienced
- Debug issues with visual context
- Understand friction points
- Validate UX hypotheses
- Support troubleshooting

### Implementation Effort
**Very High** - Complex recording logic + storage + player UI

---

## Implementation Roadmap

### Phase 1: Core Enhancements (Q1)
1. **Error Tracking** 🔴 - Critical for product quality
2. **Performance Metrics** 🔴 - SEO and UX impact
3. **Engagement Scoring** 🔴 - Better measure of success
4. **User Journey Tracking** 🔴 - Understand flows

**Estimated Effort**: 6-8 weeks

### Phase 2: Conversion & Testing (Q2)
5. **Conversion Tracking** 🟡 - Measure business impact
6. **A/B Testing** 🟡 - Built-in experimentation
7. **Form Analytics** 🟡 - Optimize conversions
8. **Site Search** 🟡 - Content optimization

**Estimated Effort**: 8-10 weeks

### Phase 3: Scale & Performance (Q3)
9. **Multi-Site Support** 🟡 - Agency/enterprise ready
10. **Aggregated Tables** 🟡 - Performance at scale
11. **Data Retention** 🟢 - Cost control
12. **Bot Filtering** 🟡 - Data quality

**Estimated Effort**: 6-8 weeks

### Phase 4: Advanced Features (Q4)
13. **Custom Dimensions** 🟢 - Flexibility
14. **Alerts & Anomaly Detection** 🟢 - Proactive monitoring
15. **Session Replay** 🟢 - Ultimate debugging

**Estimated Effort**: 10-12 weeks

---

## Technical Considerations

### Database Impact
- **Current size**: ~57 fields across 4 tables
- **After full implementation**: ~300+ fields across 20+ tables
- **Mitigation**:
  - Use table partitioning for large tables (pageviews, events)
  - Implement archival strategy
  - Add read replicas for dashboard queries

### Performance Optimization
- **Indexes**: Add 30+ new indexes (carefully monitor index bloat)
- **Materialized Views**: Consider for complex aggregations
- **Caching**: Redis for frequently accessed aggregates
- **Query Optimization**: Use EXPLAIN ANALYZE for all new queries

### Privacy & Compliance
- **GDPR**: Data minimization, right to deletion, consent management
- **CCPA**: Data disclosure, opt-out mechanisms
- **Data anonymization**: Ensure IP hashing is irreversible
- **PII detection**: Automated scanning for personal data

### Backward Compatibility
- **Migration strategy**: Use Prisma migrations for all schema changes
- **Feature flags**: Toggle new features without breaking existing functionality
- **API versioning**: Consider /v2/ endpoints for breaking changes
- **Data migration**: Plan for zero-downtime migrations

---

## Competitive Analysis

### Current State vs Competitors

| Feature | My Analytics | Google Analytics 4 | Plausible | Matomo |
|---------|--------------|-------------------|-----------|--------|
| Pageview Tracking | ✅ (36 fields) | ✅ | ✅ | ✅ |
| Custom Events | ✅ | ✅ | ✅ | ✅ |
| Real-time Dashboard | ⚠️ (5-min window) | ✅ | ✅ | ✅ |
| Performance Metrics | ❌ | ✅ | ❌ | ✅ |
| User Journey | ❌ | ✅ | ❌ | ✅ |
| Conversion Tracking | ❌ | ✅ | ✅ | ✅ |
| A/B Testing | ❌ | ⚠️ (via Optimize) | ❌ | ✅ |
| Form Analytics | ❌ | ⚠️ (Enhanced Measurement) | ❌ | ✅ |
| Error Tracking | ❌ | ❌ | ❌ | ❌ |
| Session Replay | ❌ | ❌ | ❌ | ✅ (plugin) |
| Self-Hosted | ✅ | ❌ | ✅ | ✅ |
| Privacy-First | ✅ | ❌ | ✅ | ✅ |
| MFA Authentication | ✅ | ✅ | ❌ | ✅ |

**Gaps to Address**: Performance metrics, user journeys, conversions, A/B testing

---

## Quick Wins (High Impact, Low Effort)

### 1. Add Error Tracking (2-3 days)
- Global error handler in tracker
- Simple `errors` table
- Dashboard page showing recent errors

### 2. Add Performance Metrics (3-5 days)
- Collect Performance API data in tracker
- Add fields to `pageviews` table
- Dashboard charts for Core Web Vitals

### 3. Add Exit/Entry Page Flags (1 day)
- Calculate on session end
- Update `pageviews` table
- Enable bounce rate calculation

### 4. Add Bot Type Classification (2 days)
- Enhance bot detection
- Add `bot_type` field
- Filter dashboard by bot type

### 5. Add Custom Event Metadata Indexing (1 day)
- Create GIN index on `events.event_metadata`
- Enable fast JSONB queries
- Search events by metadata properties

---

## Conclusion

The current data model is **strong and privacy-focused**. These enhancements would:

1. **Improve Product Quality**: Error tracking, performance monitoring
2. **Enable Growth**: Conversion tracking, A/B testing
3. **Scale Efficiently**: Aggregates, multi-site support
4. **Differentiate**: Session replay, advanced bot filtering
5. **Maintain Privacy**: All features designed with privacy-first approach

**Recommended Starting Point**:
- Implement **Phase 1** (Core Enhancements) to provide immediate value
- Validate with users before investing in advanced features
- Maintain backward compatibility throughout
- Keep privacy as the #1 design principle

---

**Next Steps**:
1. Prioritize features based on user feedback
2. Create detailed technical specs for Phase 1
3. Design migration strategy
4. Build prototypes for validation
5. Implement incrementally with feature flags


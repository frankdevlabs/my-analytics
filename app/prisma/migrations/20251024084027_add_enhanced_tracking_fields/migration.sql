/*
  Migration: Add Enhanced Tracking Fields (9 → 36 fields)

  This migration expands the Pageview model from 9 to 36 fields to support
  comprehensive analytics tracking including session management, bot detection,
  browser intelligence, engagement metrics, and custom events.

  WARNING: This migration drops all existing pageview data as confirmed by user.
  The application is in early stage and no backfill is needed.

  Changes:
  - Drops existing pageview data (user confirmed - early stage, no data loss concern)
  - Adds 27 new fields to pageviews table (all nullable for backward compatibility)
  - Creates new Events table for custom event tracking with JSONB metadata
  - Adds 4 new indexes for session-based and page_id queries
  - Adds unique constraint on page_id for foreign key reference
*/

-- Step 1: Drop existing pageview data (user confirmed - early stage, no backfill needed)
TRUNCATE TABLE "pageviews" CASCADE;

-- Step 2: Add 27 new fields to pageviews table
ALTER TABLE "pageviews"
  -- Page Context fields (5 fields)
  ADD COLUMN "hostname" VARCHAR(255),
  ADD COLUMN "page_id" TEXT NOT NULL DEFAULT ('clq' || replace(gen_random_uuid()::text, '-', '')),
  ADD COLUMN "document_title" VARCHAR(500),
  ADD COLUMN "hash" VARCHAR(1000),
  ADD COLUMN "query_string" VARCHAR(2000),

  -- Session & Classification fields (3 fields)
  ADD COLUMN "session_id" VARCHAR(255),
  ADD COLUMN "is_bot" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "is_internal_referrer" BOOLEAN NOT NULL DEFAULT false,

  -- Browser Intelligence fields (4 fields)
  ADD COLUMN "browser_name" VARCHAR(100),
  ADD COLUMN "browser_version" VARCHAR(50),
  ADD COLUMN "os_name" VARCHAR(100),
  ADD COLUMN "os_version" VARCHAR(50),

  -- Device Details fields (4 fields)
  ADD COLUMN "viewport_width" INTEGER,
  ADD COLUMN "viewport_height" INTEGER,
  ADD COLUMN "screen_width" INTEGER,
  ADD COLUMN "screen_height" INTEGER,

  -- Locale & Environment fields (3 fields)
  ADD COLUMN "language" VARCHAR(10),
  ADD COLUMN "timezone" VARCHAR(100),
  ADD COLUMN "user_agent" VARCHAR(1000) NOT NULL DEFAULT '',

  -- Marketing Attribution fields (4 additional UTM parameters)
  ADD COLUMN "utm_medium" VARCHAR(255),
  ADD COLUMN "utm_campaign" VARCHAR(255),
  ADD COLUMN "utm_content" VARCHAR(255),
  ADD COLUMN "utm_term" VARCHAR(255),

  -- Engagement Metrics fields (3 fields)
  ADD COLUMN "scrolled_percentage" INTEGER,
  ADD COLUMN "time_on_page_seconds" INTEGER,
  ADD COLUMN "visibility_changes" INTEGER NOT NULL DEFAULT 0;

-- Step 3: Add unique constraint on page_id for foreign key reference
CREATE UNIQUE INDEX "pageviews_page_id_key" ON "pageviews"("page_id");

-- Step 4: Create new indexes for session-based queries
CREATE INDEX "idx_pageviews_session_timestamp" ON "pageviews"("session_id", "added_iso");
CREATE INDEX "idx_pageviews_session_id" ON "pageviews"("session_id");
CREATE INDEX "idx_pageviews_is_bot" ON "pageviews"("is_bot");

-- Step 5: Create Events table for custom event tracking
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "event_name" VARCHAR(255) NOT NULL,
    "event_metadata" JSONB,
    "page_id" VARCHAR(255),
    "session_id" VARCHAR(255),
    "timestamp" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "path" VARCHAR(2000) NOT NULL,
    "country_code" CHAR(2),

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- Step 6: Create indexes for event analysis queries
CREATE INDEX "idx_events_name_timestamp" ON "events"("event_name", "timestamp");
CREATE INDEX "idx_events_session_timestamp" ON "events"("session_id", "timestamp");
CREATE INDEX "idx_events_page_id" ON "events"("page_id");

-- Step 7: Add foreign key constraint from events to pageviews (nullable)
ALTER TABLE "events" ADD CONSTRAINT "events_page_id_fkey"
  FOREIGN KEY ("page_id") REFERENCES "pageviews"("page_id")
  ON DELETE SET NULL ON UPDATE CASCADE;

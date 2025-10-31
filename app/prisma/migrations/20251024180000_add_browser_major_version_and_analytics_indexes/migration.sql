/*
  Migration: Add Browser Major Version and Analytics Indexes

  This migration adds the browser_major_version field to support cleaner
  browser analytics display and adds performance indexes for device and
  browser analytics queries.

  Changes:
  - Adds browser_major_version VARCHAR(10) field (nullable)
  - Adds index on (device_type, added_iso) for device analytics
  - Adds index on (browser_name, added_iso) for browser analytics

  Performance Impact:
  - Field addition: Minimal (nullable column, no data transformation)
  - Index creation: ~1-5 seconds per index on typical datasets

  Rollback:
  - Field can be removed safely (nullable, no dependencies)
  - Indexes can be dropped without data loss
*/

-- Step 1: Add browser_major_version field to pageviews table
-- This field stores the extracted major version (e.g., "120" from "120.0.6099.109")
-- Nullable to allow for null/malformed browser versions
ALTER TABLE "pageviews"
  ADD COLUMN "browser_major_version" VARCHAR(10);

-- Step 2: Add performance index for device type analytics
-- Optimizes queries that filter by device_type and aggregate by date range
CREATE INDEX "idx_pageviews_device_timestamp"
  ON "pageviews"("device_type", "added_iso");

-- Step 3: Add performance index for browser analytics
-- Optimizes queries that filter by browser_name and aggregate by date range
CREATE INDEX "idx_pageviews_browser_timestamp"
  ON "pageviews"("browser_name", "added_iso");

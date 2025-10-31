/*
  Migration: Add Referrer Domain and Category Fields

  This migration adds two new fields to support referrer source categorization:
  - referrer_domain: Extracted domain from document_referrer for efficient grouping
  - referrer_category: Categorized referrer type (Direct, Search, Social, External)

  Changes:
  - Adds referrer_domain VARCHAR(255) field (nullable)
  - Adds referrer_category VARCHAR(50) field (nullable)
  - Creates composite index on (referrer_domain, added_iso) for time-filtered domain queries
  - Creates composite index on (referrer_category, added_iso) for time-filtered category aggregation

  Note: Data backfill is handled separately via backfill-referrer-data.ts script
*/

-- Step 1: Add referrer_domain field to pageviews table
ALTER TABLE "pageviews"
  ADD COLUMN "referrer_domain" VARCHAR(255);

-- Step 2: Add referrer_category field to pageviews table
ALTER TABLE "pageviews"
  ADD COLUMN "referrer_category" VARCHAR(50);

-- Step 3: Create index on referrer_domain with added_iso for time-filtered domain queries
CREATE INDEX "idx_pageviews_referrer_domain" ON "pageviews"("referrer_domain", "added_iso");

-- Step 4: Create index on referrer_category with added_iso for category aggregation queries
CREATE INDEX "idx_pageviews_referrer_category" ON "pageviews"("referrer_category", "added_iso");

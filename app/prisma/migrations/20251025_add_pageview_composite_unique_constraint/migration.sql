-- CreateIndex
-- Add composite unique constraint on (added_iso, path, session_id, hostname)
-- This prevents duplicate pageview records from CSV imports and tracking API
-- Note: NULL values in session_id are allowed (NULL != NULL in SQL unique constraints)
CREATE UNIQUE INDEX "pageviews_unique_composite" ON "pageviews"("added_iso", "path", "session_id", "hostname");

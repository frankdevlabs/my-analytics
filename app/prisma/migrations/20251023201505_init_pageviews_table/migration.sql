-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('desktop', 'mobile', 'tablet');

-- CreateTable
CREATE TABLE "pageviews" (
    "id" TEXT NOT NULL,
    "added_iso" TIMESTAMPTZ(3) NOT NULL,
    "path" VARCHAR(2000) NOT NULL,
    "country_code" CHAR(2),
    "device_type" "DeviceType" NOT NULL,
    "document_referrer" VARCHAR(2000),
    "utm_source" VARCHAR(255),
    "duration_seconds" INTEGER NOT NULL,
    "is_unique" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pageviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_pageviews_timestamp" ON "pageviews"("added_iso");

-- CreateIndex
CREATE INDEX "idx_pageviews_path_timestamp" ON "pageviews"("path", "added_iso");

-- CreateIndex
CREATE INDEX "idx_pageviews_country_timestamp" ON "pageviews"("country_code", "added_iso");

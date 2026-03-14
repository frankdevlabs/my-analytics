-- CreateEnum
CREATE TYPE "EmailSchedule" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "EmailType" AS ENUM ('DAILY_REPORT', 'WEEKLY_REPORT', 'MONTHLY_REPORT', 'TRAFFIC_SPIKE', 'DOWNTIME');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('SENT', 'FAILED');

-- CreateTable
CREATE TABLE "websites" (
    "id" TEXT NOT NULL,
    "domain" VARCHAR(255) NOT NULL,
    "userId" TEXT NOT NULL,
    "apiKey" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "websites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "websiteId" TEXT,
    "reportSchedule" "EmailSchedule",
    "reportEnabled" BOOLEAN NOT NULL DEFAULT false,
    "spikeAlertEnabled" BOOLEAN NOT NULL DEFAULT false,
    "spikeThreshold" INTEGER,
    "lastSpikeTriggeredAt" TIMESTAMPTZ(3),
    "downtimeAlertEnabled" BOOLEAN NOT NULL DEFAULT false,
    "downtimeThresholdMinutes" INTEGER,
    "lastDowntimeTriggeredAt" TIMESTAMPTZ(3),
    "alertCooldownHours" INTEGER NOT NULL DEFAULT 1,
    "templateConfig" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "email_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_delivery_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "websiteId" TEXT,
    "emailType" "EmailType" NOT NULL,
    "recipientEmail" VARCHAR(255) NOT NULL,
    "sentAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "EmailStatus" NOT NULL,
    "errorMessage" TEXT,

    CONSTRAINT "email_delivery_logs_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "pageviews" ADD COLUMN "website_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "websites_apiKey_key" ON "websites"("apiKey");

-- CreateIndex
CREATE INDEX "idx_websites_user_id" ON "websites"("userId");

-- CreateIndex
CREATE INDEX "idx_websites_api_key" ON "websites"("apiKey");

-- CreateIndex
CREATE INDEX "idx_email_preferences_user_id" ON "email_preferences"("userId");

-- CreateIndex
CREATE INDEX "idx_email_preferences_website_id" ON "email_preferences"("websiteId");

-- CreateIndex
CREATE INDEX "idx_email_logs_user_id" ON "email_delivery_logs"("userId");

-- CreateIndex
CREATE INDEX "idx_email_logs_sent_at" ON "email_delivery_logs"("sentAt");

-- CreateIndex
CREATE INDEX "idx_email_logs_status" ON "email_delivery_logs"("status");

-- CreateIndex
CREATE INDEX "idx_pageviews_website_id" ON "pageviews"("website_id");

-- AddForeignKey
ALTER TABLE "pageviews" ADD CONSTRAINT "pageviews_website_id_fkey" FOREIGN KEY ("website_id") REFERENCES "websites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_preferences" ADD CONSTRAINT "email_preferences_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_delivery_logs" ADD CONSTRAINT "email_delivery_logs_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "websites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

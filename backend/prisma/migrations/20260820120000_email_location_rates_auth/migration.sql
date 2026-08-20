-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "sentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RateCard" ADD COLUMN "isFallback" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "RateCard_orderType_rateScope_isFallback_active_idx" ON "RateCard"("orderType", "rateScope", "isFallback", "active");

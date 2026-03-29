-- CreateTable
CREATE TABLE "subscription_usages" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ai_interactions_count" INTEGER NOT NULL DEFAULT 0,
    "receipts_count" INTEGER NOT NULL DEFAULT 0,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_usages_user_id_key" ON "subscription_usages"("user_id");

-- AddForeignKey
ALTER TABLE "subscription_usages" ADD CONSTRAINT "subscription_usages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

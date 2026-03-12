-- Add created_by_id to tables that were missing it
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "created_by_id" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "created_by_id" TEXT;
ALTER TABLE "budgets" ADD COLUMN IF NOT EXISTS "created_by_id" TEXT;
ALTER TABLE "credit_cards" ADD COLUMN IF NOT EXISTS "created_by_id" TEXT;
ALTER TABLE "attachments" ADD COLUMN IF NOT EXISTS "created_by_id" TEXT;

-- Add is_global to categories
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "is_global" BOOLEAN NOT NULL DEFAULT false;

-- Create PaymentMethod enum
DO $$ BEGIN
    CREATE TYPE "PaymentMethod" AS ENUM ('credit_card', 'debit', 'pix', 'cash', 'transfer', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable transaction_splits
CREATE TABLE IF NOT EXISTS "transaction_splits" (
    "id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "credit_card_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_splits_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "transaction_splits" ADD CONSTRAINT "transaction_splits_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_splits" ADD CONSTRAINT "transaction_splits_credit_card_id_fkey" FOREIGN KEY ("credit_card_id") REFERENCES "credit_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

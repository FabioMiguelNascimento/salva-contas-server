-- CreateEnum
CREATE TYPE "DebitCardStatus" AS ENUM ('active', 'blocked', 'expired', 'cancelled');

-- CreateTable
CREATE TABLE "debit_cards" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_by_id" TEXT,
    "name" TEXT NOT NULL,
    "flag" "CreditCardFlag" NOT NULL,
    "last_four_digits" TEXT NOT NULL,
    "status" "DebitCardStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "debit_cards_pkey" PRIMARY KEY ("id")
);

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('monthly', 'yearly');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "billing_cycle" "BillingCycle";

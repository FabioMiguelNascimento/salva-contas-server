/*
  Warnings:

  - You are about to drop the column `stripe_customer_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `stripe_subscription_id` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[mp_customer_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[mp_preapproval_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "users_stripe_customer_id_key";

-- DropIndex
DROP INDEX "users_stripe_subscription_id_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "stripe_customer_id",
DROP COLUMN "stripe_subscription_id",
ADD COLUMN     "mp_customer_id" TEXT,
ADD COLUMN     "mp_preapproval_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_mp_customer_id_key" ON "users"("mp_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_mp_preapproval_id_key" ON "users"("mp_preapproval_id");

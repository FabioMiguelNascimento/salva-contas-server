-- CreateEnum
CREATE TYPE "VaultHistoryType" AS ENUM ('deposit', 'withdraw', 'yield');

-- CreateTable
CREATE TABLE "vault_history_events" (
    "id" TEXT NOT NULL,
    "vault_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "VaultHistoryType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "balance_after" DECIMAL(10,2) NOT NULL,
    "happened_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vault_history_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_vault_history_vault_happened" ON "vault_history_events"("vault_id", "happened_at", "id");

-- CreateIndex
CREATE INDEX "idx_vault_history_user_happened" ON "vault_history_events"("user_id", "happened_at");

-- CreateIndex
CREATE INDEX "idx_vault_history_vault_type" ON "vault_history_events"("vault_id", "type");

-- AddForeignKey
ALTER TABLE "vault_history_events" ADD CONSTRAINT "vault_history_events_vault_id_fkey" FOREIGN KEY ("vault_id") REFERENCES "vaults"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vault_history_events" ADD CONSTRAINT "vault_history_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

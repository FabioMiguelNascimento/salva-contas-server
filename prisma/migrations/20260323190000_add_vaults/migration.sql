-- CreateTable
CREATE TABLE "vaults" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "target_amount" DECIMAL(10,2),
    "current_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "color" TEXT,
    "icon" TEXT,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vaults_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "vault_id" TEXT;

-- CreateIndex
CREATE INDEX "idx_vaults_user" ON "vaults"("user_id");

-- CreateIndex
CREATE INDEX "idx_transactions_vault" ON "transactions"("vault_id");

-- AddForeignKey
ALTER TABLE "vaults" ADD CONSTRAINT "vaults_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_vault_id_fkey" FOREIGN KEY ("vault_id") REFERENCES "vaults"("id") ON DELETE SET NULL ON UPDATE CASCADE;

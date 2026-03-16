-- AlterTable
ALTER TABLE "transaction_splits" ADD COLUMN     "debit_card_id" TEXT;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "debit_card_id" TEXT;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_debit_card_id_fkey" FOREIGN KEY ("debit_card_id") REFERENCES "debit_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_splits" ADD CONSTRAINT "transaction_splits_debit_card_id_fkey" FOREIGN KEY ("debit_card_id") REFERENCES "debit_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

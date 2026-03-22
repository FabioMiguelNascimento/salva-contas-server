-- CreateIndex
CREATE INDEX "idx_transaction_splits_credit_card" ON "transaction_splits"("credit_card_id");

-- CreateIndex
CREATE INDEX "idx_transactions_card_expense" ON "transactions"("user_id", "credit_card_id", "type");

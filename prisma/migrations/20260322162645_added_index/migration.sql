-- CreateIndex
CREATE INDEX "idx_transactions_confirm_duplicate" ON "transactions"("user_id", "description", "amount", "category_name", "type", "status", "due_date", "payment_date", "credit_card_id", "debit_card_id");

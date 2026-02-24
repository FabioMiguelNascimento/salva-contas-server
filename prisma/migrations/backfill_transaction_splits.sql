-- Backfill: create one TransactionSplit for every existing Transaction that has no splits yet.
-- For transactions with a credit_card_id  → paymentMethod = 'credit_card'
-- For transactions without a credit_card_id → paymentMethod = 'cash'

INSERT INTO transaction_splits (id, transaction_id, amount, payment_method, credit_card_id, created_at)
SELECT
    gen_random_uuid()                                                                    AS id,
    t.id                                                                                 AS transaction_id,
    t.amount                                                                             AS amount,
    (CASE WHEN t.credit_card_id IS NOT NULL THEN 'credit_card' ELSE 'cash' END)::"PaymentMethod"  AS payment_method,
    t.credit_card_id                                                                     AS credit_card_id,
    t.created_at                                                                         AS created_at
FROM transactions t
WHERE NOT EXISTS (
    SELECT 1 FROM transaction_splits s WHERE s.transaction_id = t.id
);

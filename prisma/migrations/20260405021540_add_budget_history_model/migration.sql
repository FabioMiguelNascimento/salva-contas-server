-- CreateEnum
CREATE TYPE "BudgetHistoryAction" AS ENUM ('created', 'updated');

-- CreateTable
CREATE TABLE "budget_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_by_id" TEXT,
    "budget_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "action" "BudgetHistoryAction" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "previous_amount" DECIMAL(10,2),
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_budget_history_user_category_period" ON "budget_history"("user_id", "category_id", "year", "month");

-- CreateIndex
CREATE INDEX "idx_budget_history_budget_created" ON "budget_history"("budget_id", "created_at");

-- AddForeignKey
ALTER TABLE "budget_history" ADD CONSTRAINT "budget_history_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_history" ADD CONSTRAINT "budget_history_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

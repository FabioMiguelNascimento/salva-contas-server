import { Module } from '@nestjs/common';
import { BudgetsModule } from './budgets/budgets.module';
import { CategoriesModule } from './categories/categories.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  imports: [TransactionsModule, CategoriesModule, SubscriptionsModule, DashboardModule, BudgetsModule],
})
export class AppModule {}

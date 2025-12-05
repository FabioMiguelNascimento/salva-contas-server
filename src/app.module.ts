import { Module } from '@nestjs/common';
import { BudgetsModule } from './budgets/budgets.module';
import { CategoriesModule } from './categories/categories.module';
import { CreditCardsModule } from './credit-cards/credit-cards.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  imports: [TransactionsModule, CategoriesModule, SubscriptionsModule, DashboardModule, BudgetsModule, NotificationsModule, CreditCardsModule],
})
export class AppModule {}

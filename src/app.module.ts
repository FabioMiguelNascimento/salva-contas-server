import { Module } from '@nestjs/common';
import { CategoriesModule } from './categories/categories.module';
import { TransactionsModule } from './transactions/transactions.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';

@Module({
  imports: [TransactionsModule, CategoriesModule, SubscriptionsModule],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { CategoriesModule } from './categories/categories.module';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  imports: [TransactionsModule, CategoriesModule],
})
export class AppModule {}

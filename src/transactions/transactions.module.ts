import { Module } from '@nestjs/common';
import { CreditCardsRepositoryInterface } from 'src/credit-cards/credit-cards.interface';
import { CreditCardsRepository } from 'src/credit-cards/credit-cards.repository';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TransactionsController } from './transactions.controller';
import { TransactionsRepositoryInterface } from './transactions.interface';
import TransactionsRepository from './transactions.repository';
import CreateManualTransactionUseCase from './use-cases/create-manual-transaction.use-case';
import { DeleteTransactionUseCase } from './use-cases/delete-transaction.use-case';
import GetTransactionsUseCase from './use-cases/get-transactions.use-case';
import ProcessTransactionUseCase from './use-cases/process-transaction.use-case';
import { UpdateTransactionUseCase } from './use-cases/update-transaction.use-case';
import { CategoriesRepositoryInterface } from 'src/categories/categories.interface';
import CategoriesRepository from 'src/categories/categories.repository';

@Module({
  imports: [PrismaModule],
  controllers: [TransactionsController],
  providers: [
    ProcessTransactionUseCase,
    CreateManualTransactionUseCase,
    GetTransactionsUseCase,
    UpdateTransactionUseCase,
    DeleteTransactionUseCase,
    {
      provide: TransactionsRepositoryInterface,
      useClass: TransactionsRepository
    },
    {
      provide: CreditCardsRepositoryInterface,
      useClass: CreditCardsRepository
    },
    {
      provide: CategoriesRepositoryInterface,
      useClass: CategoriesRepository
    }
  ]
})
export class TransactionsModule {}

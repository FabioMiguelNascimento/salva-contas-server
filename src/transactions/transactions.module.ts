import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TransactionsController } from './transactions.controller';
import { TransactionsRepositoryInterface } from './transactions.interface';
import TransactionsRepository from './transactions.repository';
import CreateManualTransactionUseCase from './use-cases/create-manual-transaction.use-case';
import GetTransactionsUseCase from './use-cases/get-transactions.use-case';
import ProcessTransactionUseCase from './use-cases/process-transaction.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [TransactionsController],
  providers: [
    ProcessTransactionUseCase,
    CreateManualTransactionUseCase,
    GetTransactionsUseCase,
    {
      provide: TransactionsRepositoryInterface,
      useClass: TransactionsRepository
    }
  ]
})
export class TransactionsModule {}

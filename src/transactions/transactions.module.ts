import { Module } from '@nestjs/common';
import { CategoriesRepositoryInterface } from 'src/categories/categories.interface';
import CategoriesRepository from 'src/categories/categories.repository';
import { CreditCardsRepositoryInterface } from 'src/credit-cards/credit-cards.interface';
import { CreditCardsRepository } from 'src/credit-cards/credit-cards.repository';
import { GEN_AI_SERVICE } from 'src/gen-ai/gen-ai.interface';
import { GenAIService } from 'src/gen-ai/gen-ai.service';
import { GeminiGenAIProvider } from 'src/gen-ai/providers/gemini-gen-ai.provider';
import { GroqGenAIProvider } from 'src/gen-ai/providers/groq-gen-ai.provider';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TransactionsController } from './transactions.controller';
import { TransactionsRepositoryInterface } from './transactions.interface';
import TransactionsRepository from './transactions.repository';
import { DeleteTransactionUseCase } from './use-cases/delete-transaction.use-case';
import GetTransactionsUseCase from './use-cases/get-transactions.use-case';
import ProcessTransactionUseCase from './use-cases/process-transaction.use-case';
import { UpdateTransactionUseCase } from './use-cases/update-transaction.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [TransactionsController],
  providers: [
    ProcessTransactionUseCase,
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
    },
    GeminiGenAIProvider,
    GroqGenAIProvider,
    {
      provide: GEN_AI_SERVICE,
      useClass: GenAIService,
    },
  ]
})
export class TransactionsModule {}

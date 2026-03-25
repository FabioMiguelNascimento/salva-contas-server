import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DebitCardsController } from './debit-cards.controller';
import { DebitCardsRepositoryInterface } from './debit-cards.interface';
import { DebitCardsRepository } from './debit-cards.repository';
import { CreateDebitCardUseCase } from './use-cases/create-debit-card.use-case';
import { DeleteDebitCardUseCase } from './use-cases/delete-debit-card.use-case';
import { GetDebitCardByIdUseCase } from './use-cases/get-debit-card-by-id.use-case';
import { GetDebitCardMetricsUseCase } from './use-cases/get-debit-card-metrics.use-case';
import { GetDebitCardsUseCase } from './use-cases/get-debit-cards.use-case';
import { UpdateDebitCardUseCase } from './use-cases/update-debit-card.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [DebitCardsController],
  providers: [
    {
      provide: DebitCardsRepositoryInterface,
      useClass: DebitCardsRepository,
    },
    CreateDebitCardUseCase,
    GetDebitCardsUseCase,
    GetDebitCardByIdUseCase,
    UpdateDebitCardUseCase,
    DeleteDebitCardUseCase,
    GetDebitCardMetricsUseCase,
  ],
  exports: [],
})
export class DebitCardsModule {}

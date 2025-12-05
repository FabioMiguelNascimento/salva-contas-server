import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CreditCardsController } from './credit-cards.controller';
import { CreditCardsRepositoryInterface } from './credit-cards.interface';
import { CreditCardsRepository } from './credit-cards.repository';
import { CreateCreditCardUseCase } from './use-cases/create-credit-card.use-case';
import { DeleteCreditCardUseCase } from './use-cases/delete-credit-card.use-case';
import { GetCreditCardByIdUseCase } from './use-cases/get-credit-card-by-id.use-case';
import { GetCreditCardSummaryUseCase } from './use-cases/get-credit-card-summary.use-case';
import { GetCreditCardsUseCase } from './use-cases/get-credit-cards.use-case';
import { UpdateCreditCardUseCase } from './use-cases/update-credit-card.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [CreditCardsController],
  providers: [
    {
      provide: CreditCardsRepositoryInterface,
      useClass: CreditCardsRepository,
    },
    CreateCreditCardUseCase,
    GetCreditCardsUseCase,
    GetCreditCardByIdUseCase,
    UpdateCreditCardUseCase,
    DeleteCreditCardUseCase,
    GetCreditCardSummaryUseCase,
  ],
  exports: [],
})
export class CreditCardsModule {}
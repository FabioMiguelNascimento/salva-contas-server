import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BudgetsController } from './budgets.controller';
import { BudgetsRepositoryInterface } from './budgets.interface';
import { BudgetsRepository } from './budgets.repository';
import { CreateBudgetUseCase } from './use-cases/create-budget.use-case';
import { DeleteBudgetUseCase } from './use-cases/delete-budget.use-case';
import { GetBudgetProgressUseCase } from './use-cases/get-budget-progress.use-case';
import { GetBudgetsUseCase } from './use-cases/get-budgets.use-case';
import { UpdateBudgetUseCase } from './use-cases/update-budget.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [BudgetsController],
  providers: [
    {
      provide: BudgetsRepositoryInterface,
      useClass: BudgetsRepository,
    },
    CreateBudgetUseCase,
    GetBudgetsUseCase,
    UpdateBudgetUseCase,
    DeleteBudgetUseCase,
    GetBudgetProgressUseCase,
  ],
  exports: [GetBudgetProgressUseCase],
})
export class BudgetsModule {}
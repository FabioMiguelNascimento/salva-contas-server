import { Injectable } from '@nestjs/common';
import { GetBudgetProgressInput } from 'src/schemas/budgets.schema';
import { BudgetsRepositoryInterface } from '../budgets.interface';

@Injectable()
export class GetBudgetProgressUseCase {
  constructor(private readonly budgetsRepository: BudgetsRepositoryInterface) {}

  async execute(data: GetBudgetProgressInput) {
    return this.budgetsRepository.getBudgetProgress(data.month, data.year);
  }
}
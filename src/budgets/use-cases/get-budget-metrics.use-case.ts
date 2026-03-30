import { Injectable } from '@nestjs/common';
import { BudgetsRepositoryInterface } from '../budgets.interface';

@Injectable()
export class GetBudgetMetricsUseCase {
  constructor(private readonly budgetsRepository: BudgetsRepositoryInterface) {}

  async execute(month: number, year: number) {
    return this.budgetsRepository.getMetrics(month, year);
  }
}

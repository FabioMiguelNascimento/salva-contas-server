import { Injectable } from '@nestjs/common';
import { BudgetsRepositoryInterface } from '../budgets.interface';

@Injectable()
export class GetBudgetHistoryUseCase {
  constructor(private readonly budgetsRepository: BudgetsRepositoryInterface) {}

  async execute(id: string, limit?: number) {
    return this.budgetsRepository.getBudgetHistory(id, limit);
  }
}

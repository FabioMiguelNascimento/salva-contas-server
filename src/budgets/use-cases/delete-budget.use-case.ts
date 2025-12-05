import { Injectable, NotFoundException } from '@nestjs/common';
import { BudgetsRepositoryInterface } from '../budgets.interface';

@Injectable()
export class DeleteBudgetUseCase {
  constructor(private readonly budgetsRepository: BudgetsRepositoryInterface) {}

  async execute(id: string): Promise<void> {
    try {
      await this.budgetsRepository.deleteBudget(id);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Budget not found');
      }
      throw error;
    }
  }
}
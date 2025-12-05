import { Injectable, NotFoundException } from '@nestjs/common';
import { Budget } from 'generated/prisma/client';
import { UpdateBudgetInput } from 'src/schemas/budgets.schema';
import { BudgetsRepositoryInterface } from '../budgets.interface';

@Injectable()
export class UpdateBudgetUseCase {
  constructor(private readonly budgetsRepository: BudgetsRepositoryInterface) {}

  async execute(id: string, data: UpdateBudgetInput): Promise<Budget> {
    try {
      return await this.budgetsRepository.updateBudget(id, data);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Budget not found');
      }
      throw error;
    }
  }
}
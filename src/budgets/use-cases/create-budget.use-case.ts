import { ConflictException, Injectable } from '@nestjs/common';
import { Budget } from 'generated/prisma/client';
import { CreateBudgetInput } from 'src/schemas/budgets.schema';
import { BudgetsRepositoryInterface } from '../budgets.interface';

@Injectable()
export class CreateBudgetUseCase {
  constructor(private readonly budgetsRepository: BudgetsRepositoryInterface) {}

  async execute(data: CreateBudgetInput): Promise<Budget> {
    try {
      return await this.budgetsRepository.createBudget(data);
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Budget already exists for this category and period');
      }
      throw error;
    }
  }
}
import { Injectable } from '@nestjs/common';
import { GetBudgetsInput } from 'src/schemas/budgets.schema';
import { BudgetsRepositoryInterface } from '../budgets.interface';
import { Budget } from 'generated/prisma/client';

@Injectable()
export class GetBudgetsUseCase {
  constructor(private readonly budgetsRepository: BudgetsRepositoryInterface) {}

  async execute(filters?: GetBudgetsInput): Promise<Budget[]> {
    return this.budgetsRepository.getBudgets(filters?.month, filters?.year);
  }
}
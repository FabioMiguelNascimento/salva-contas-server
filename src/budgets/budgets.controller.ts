import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
    CreateBudgetInput,
    CreateBudgetSchema,
    GetBudgetHistoryInput,
    GetBudgetHistorySchema,
    GetBudgetProgressInput,
    GetBudgetProgressSchema,
    GetBudgetsInput,
    GetBudgetsSchema,
    UpdateBudgetInput,
    UpdateBudgetSchema,
} from '../schemas/budgets.schema';
import { success } from '../utils/api-response-helper';
import { CreateBudgetUseCase } from './use-cases/create-budget.use-case';
import { DeleteBudgetUseCase } from './use-cases/delete-budget.use-case';
import { GetBudgetHistoryUseCase } from './use-cases/get-budget-history.use-case';
import { GetBudgetMetricsUseCase } from './use-cases/get-budget-metrics.use-case';
import { GetBudgetProgressUseCase } from './use-cases/get-budget-progress.use-case';
import { GetBudgetsUseCase } from './use-cases/get-budgets.use-case';
import { UpdateBudgetUseCase } from './use-cases/update-budget.use-case';

@Controller('budgets')
export class BudgetsController {
  constructor(
    private readonly createBudgetUseCase: CreateBudgetUseCase,
    private readonly getBudgetsUseCase: GetBudgetsUseCase,
    private readonly getBudgetMetricsUseCase: GetBudgetMetricsUseCase,
    private readonly updateBudgetUseCase: UpdateBudgetUseCase,
    private readonly deleteBudgetUseCase: DeleteBudgetUseCase,
    private readonly getBudgetProgressUseCase: GetBudgetProgressUseCase,
    private readonly getBudgetHistoryUseCase: GetBudgetHistoryUseCase,
  ) {}

  @Get('metrics')
  async getMetrics(
    @Query(new ZodValidationPipe(GetBudgetsSchema)) filters: GetBudgetsInput,
  ) {
    const month = filters.month || new Date().getMonth() + 1;
    const year = filters.year || new Date().getFullYear();
    const metrics = await this.getBudgetMetricsUseCase.execute(month, year);
    return success(metrics, 'Métricas de orçamento recuperadas com sucesso');
  }

  @Post()
  async createBudget(
    @Body(new ZodValidationPipe(CreateBudgetSchema)) data: CreateBudgetInput,
  ) {
    const budget = await this.createBudgetUseCase.execute(data);
    return success(budget, 'Orçamento criado com sucesso');
  }

  @Get()
  async getBudgets(
    @Query(new ZodValidationPipe(GetBudgetsSchema)) filters: GetBudgetsInput,
  ) {
    const budgets = await this.getBudgetsUseCase.execute(filters);
    return success(budgets, 'Orçamentos recuperados com sucesso');
  }

  @Get('progress')
  async getBudgetProgress(
    @Query(new ZodValidationPipe(GetBudgetProgressSchema))
    filters: GetBudgetProgressInput,
  ) {
    const progress = await this.getBudgetProgressUseCase.execute(filters);
    return success(progress, 'Progresso dos orçamentos recuperado com sucesso');
  }

  @Get(':id/history')
  async getBudgetHistory(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(GetBudgetHistorySchema)) query: GetBudgetHistoryInput,
  ) {
    const history = await this.getBudgetHistoryUseCase.execute(id, query.limit);
    return success(history, 'Histórico de orçamento recuperado com sucesso');
  }

  @Patch(':id')
  async updateBudget(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateBudgetSchema)) data: UpdateBudgetInput,
  ) {
    const budget = await this.updateBudgetUseCase.execute(id, data);
    return success(budget, 'Orçamento atualizado com sucesso');
  }

  @Delete(':id')
  async deleteBudget(@Param('id') id: string) {
    await this.deleteBudgetUseCase.execute(id);
    return success(null, 'Orçamento deletado com sucesso');
  }
}

import { Controller, Get, Query } from '@nestjs/common';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { GetDashboardMetricsUseCase } from './use-cases/get-dashboard-metrics.use-case';
import { getDashboardMetricsSchema, GetDashboardMetricsDto } from 'src/schemas/dashboard.schema';
import { success } from 'src/utils/api-response-helper';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly getDashboardMetricsUseCase: GetDashboardMetricsUseCase) {}

  @Get('metrics')
  async getMetrics(@Query(new ZodValidationPipe(getDashboardMetricsSchema)) query: GetDashboardMetricsDto) {
    const metrics = await this.getDashboardMetricsUseCase.execute(query.month, query.year)
    return success(metrics, 'Dashboard metrics retrieved successfully');
  }
}
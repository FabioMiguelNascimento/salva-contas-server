import { Controller, Get, Query } from '@nestjs/common';
import {
    GetDashboardMetricsDto,
    getDashboardMetricsSchema,
    GetDashboardSnapshotDto,
    getDashboardSnapshotSchema,
} from 'src/schemas/dashboard.schema';
import { success } from 'src/utils/api-response-helper';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { GetDashboardMetricsUseCase } from './use-cases/get-dashboard-metrics.use-case';
import { GetDashboardSnapshotUseCase } from './use-cases/get-dashboard-snapshot.use-case';

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly getDashboardMetricsUseCase: GetDashboardMetricsUseCase,
    private readonly getDashboardSnapshotUseCase: GetDashboardSnapshotUseCase,
  ) {}

  @Get('metrics')
  async getMetrics(@Query(new ZodValidationPipe(getDashboardMetricsSchema)) query: GetDashboardMetricsDto) {
    const metrics = await this.getDashboardMetricsUseCase.execute(query.month, query.year)
    return success(metrics, 'Dashboard metrics retrieved successfully');
  }

  @Get('snapshot')
  async getSnapshot(@Query(new ZodValidationPipe(getDashboardSnapshotSchema)) query: GetDashboardSnapshotDto) {
    const snapshot = await this.getDashboardSnapshotUseCase.execute(query);
    return success(snapshot, 'Dashboard snapshot retrieved successfully');
  }
}
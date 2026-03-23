import { Injectable } from '@nestjs/common';
import { DashboardRepositoryInterface } from '../dashboard.interface';

@Injectable()
export class GetDashboardMetricsUseCase {
  constructor(
    private readonly dashboardRepository: DashboardRepositoryInterface,
  ) {}

  async execute(
    month?: number,
    year?: number,
    startDate?: string,
    endDate?: string,
  ) {
    return this.dashboardRepository.getMetrics(
      month,
      year,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}

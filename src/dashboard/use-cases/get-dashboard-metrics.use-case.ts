import { Injectable } from '@nestjs/common';
import { DashboardRepositoryInterface } from '../dashboard.interface';

@Injectable()
export class GetDashboardMetricsUseCase {
  constructor(private readonly dashboardRepository: DashboardRepositoryInterface) {}

  async execute(month?: number, year?: number) {
    return this.dashboardRepository.getMetrics(month, year);
  }
}
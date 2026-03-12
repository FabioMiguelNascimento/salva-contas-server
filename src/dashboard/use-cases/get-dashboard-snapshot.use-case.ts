import { Injectable } from '@nestjs/common';
import { DashboardRepositoryInterface } from '../dashboard.interface';

@Injectable()
export class GetDashboardSnapshotUseCase {
  constructor(private readonly dashboardRepository: DashboardRepositoryInterface) {}

  async execute(filters?: {
    month?: number;
    year?: number;
    status?: 'paid' | 'pending';
    type?: 'expense' | 'income';
    categoryId?: string;
  }) {
    return this.dashboardRepository.getSnapshot(filters);
  }
}

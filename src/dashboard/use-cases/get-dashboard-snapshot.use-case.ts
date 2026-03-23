import { Injectable } from '@nestjs/common';
import {
    GetDashboardSnapshotResponse,
    getDashboardSnapshotResponseSchema,
} from 'src/schemas/dashboard.schema';
import { DashboardRepositoryInterface } from '../dashboard.interface';

@Injectable()
export class GetDashboardSnapshotUseCase {
  constructor(
    private readonly dashboardRepository: DashboardRepositoryInterface,
  ) {}

  async execute(filters?: {
    month?: number;
    year?: number;
    status?: 'paid' | 'pending';
    type?: 'expense' | 'income';
    categoryId?: string;
  }): Promise<GetDashboardSnapshotResponse> {
    const snapshot = await this.dashboardRepository.getSnapshot(filters);

    // Validate the response data ranges
    const validatedSnapshot =
      getDashboardSnapshotResponseSchema.parse(snapshot);

    return validatedSnapshot;
  }
}

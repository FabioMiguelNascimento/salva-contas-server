import { Module } from '@nestjs/common';
import { FinanceModule } from '../finance/finance.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DashboardController } from './dashboard.controller';
import { DashboardRepositoryInterface } from './dashboard.interface';
import { DashboardRepository } from './dashboard.repository';
import { GetDashboardMetricsUseCase } from './use-cases/get-dashboard-metrics.use-case';
import { GetDashboardSnapshotUseCase } from './use-cases/get-dashboard-snapshot.use-case';

@Module({
  imports: [PrismaModule, FinanceModule],
  controllers: [DashboardController],
  providers: [
    {
      provide: DashboardRepositoryInterface,
      useClass: DashboardRepository,
    },
    GetDashboardMetricsUseCase,
    GetDashboardSnapshotUseCase,
  ],
  exports: [
    DashboardRepositoryInterface,
    GetDashboardMetricsUseCase,
    GetDashboardSnapshotUseCase,
  ],
})
export class DashboardModule {}

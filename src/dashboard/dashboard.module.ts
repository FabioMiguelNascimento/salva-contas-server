import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DashboardController } from './dashboard.controller';
import { DashboardRepository } from './dashboard.repository';
import { GetDashboardMetricsUseCase } from './use-cases/get-dashboard-metrics.use-case';
import { DashboardRepositoryInterface } from './dashboard.interface';

@Module({
  imports: [PrismaModule],
  controllers: [DashboardController],
  providers: [
    {
      provide: DashboardRepositoryInterface,
      useClass: DashboardRepository,
    },
    GetDashboardMetricsUseCase,
  ],
  exports: [GetDashboardMetricsUseCase],
})
export class DashboardModule {}
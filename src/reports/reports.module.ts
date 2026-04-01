import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ReportsController } from './reports.controller';
import { ExportReportUseCase } from './use-cases/export-report.use-case';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ReportsController],
  providers: [ExportReportUseCase],
})
export class ReportsModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { FinancialBalanceService } from './financial-balance.service';

@Module({
  imports: [PrismaModule],
  providers: [FinancialBalanceService],
  exports: [FinancialBalanceService],
})
export class FinanceModule {}

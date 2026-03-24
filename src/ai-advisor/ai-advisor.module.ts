import { Module } from '@nestjs/common';
import { GroqGenAIProvider } from 'src/gen-ai/providers/groq-gen-ai.provider';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TransactionsModule } from 'src/transactions/transactions.module';
import { VaultsModule } from 'src/vaults/vaults.module';
import { AiAdvisorModelService } from './ai-advisor-model.service';
import { AiAdvisorToolsService } from './ai-advisor-tools.service';
import { AiAdvisorController } from './ai-advisor.controller';
import { AiAdvisorService } from './ai-advisor.service';
import { CreateTransactionToolUseCase } from './use-cases/tools/create-transaction-tool.use-case';
import { GetExpensesByCategoryToolUseCase } from './use-cases/tools/get-expenses-by-category-tool.use-case';
import { GetMonthlySummaryToolUseCase } from './use-cases/tools/get-monthly-summary-tool.use-case';
import { GetSpendingTrendToolUseCase } from './use-cases/tools/get-spending-trend-tool.use-case';
import { GetTransactionDetailsToolUseCase } from './use-cases/tools/get-transaction-details-tool.use-case';
import { ProcessTransactionReceiptToolUseCase } from './use-cases/tools/process-transaction-receipt-tool.use-case';
import { VaultAiActionToolUseCase } from './use-cases/tools/vault-ai-action-tool.use-case';

@Module({
  imports: [PrismaModule, TransactionsModule, VaultsModule],
  controllers: [AiAdvisorController],
  providers: [
    AiAdvisorService,
    AiAdvisorToolsService,
    AiAdvisorModelService,
    GroqGenAIProvider,
    GetMonthlySummaryToolUseCase,
    GetExpensesByCategoryToolUseCase,
    GetSpendingTrendToolUseCase,
    GetTransactionDetailsToolUseCase,
    ProcessTransactionReceiptToolUseCase,
    CreateTransactionToolUseCase,
    VaultAiActionToolUseCase,
  ],
  exports: [AiAdvisorService],
})
export class AiAdvisorModule {}

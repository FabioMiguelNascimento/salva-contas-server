import { Module } from '@nestjs/common';
import { DashboardModule } from 'src/dashboard/dashboard.module';
import { GroqGenAIProvider } from 'src/gen-ai/providers/groq-gen-ai.provider';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TransactionsModule } from 'src/transactions/transactions.module';
import { VaultsModule } from 'src/vaults/vaults.module';
import { AiAdvisorModelService } from './ai-advisor-model.service';
import { AiAdvisorToolsService } from './ai-advisor-tools.service';
import { AiAdvisorController } from './ai-advisor.controller';
import { AiAdvisorService } from './ai-advisor.service';
import { ToolExecutor } from './tools/tool-executor.service';
import { ToolRegistry } from './tools/tool-registry.service';
import { CreateTransactionToolUseCase } from './use-cases/tools/create-transaction-tool.use-case';
import { DeleteTransactionToolUseCase } from './use-cases/tools/delete-transaction-tool.use-case';
import { TransactionSearchService } from './services/transaction-search.service';
import { GetExpensesByCategoryToolUseCase } from './use-cases/tools/get-expenses-by-category-tool.use-case';
import { GetMonthlySummaryToolUseCase } from './use-cases/tools/get-monthly-summary-tool.use-case';
import { GetSpendingTrendToolUseCase } from './use-cases/tools/get-spending-trend-tool.use-case';
import { GetTransactionDetailsToolUseCase } from './use-cases/tools/get-transaction-details-tool.use-case';
import { ProcessTransactionReceiptToolUseCase } from './use-cases/tools/process-transaction-receipt-tool.use-case';
import { UpdateTransactionToolUseCase } from './use-cases/tools/update-transaction-tool.use-case';
import { VaultAiActionToolUseCase } from './use-cases/tools/vault-ai-action-tool.use-case';

@Module({
  imports: [PrismaModule, TransactionsModule, VaultsModule, DashboardModule],
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
    UpdateTransactionToolUseCase,
    DeleteTransactionToolUseCase,
    VaultAiActionToolUseCase,
    TransactionSearchService,
    {
      provide: 'AI_TOOLS_ARRAY',
      useFactory: (
        getMonthlySummary: GetMonthlySummaryToolUseCase,
        getExpensesByCategory: GetExpensesByCategoryToolUseCase,
        getSpendingTrend: GetSpendingTrendToolUseCase,
        getTransactionDetails: GetTransactionDetailsToolUseCase,
        processTransactionReceipt: ProcessTransactionReceiptToolUseCase,
        createTransaction: CreateTransactionToolUseCase,
        updateTransaction: UpdateTransactionToolUseCase,
        deleteTransaction: DeleteTransactionToolUseCase,
        vaultAiAction: VaultAiActionToolUseCase,
      ) => [
        getMonthlySummary,
        getExpensesByCategory,
        getSpendingTrend,
        getTransactionDetails,
        processTransactionReceipt,
        createTransaction,
        updateTransaction,
        deleteTransaction,
        vaultAiAction,
      ],
      inject: [
        GetMonthlySummaryToolUseCase,
        GetExpensesByCategoryToolUseCase,
        GetSpendingTrendToolUseCase,
        GetTransactionDetailsToolUseCase,
        ProcessTransactionReceiptToolUseCase,
        CreateTransactionToolUseCase,
        UpdateTransactionToolUseCase,
        DeleteTransactionToolUseCase,
        VaultAiActionToolUseCase,
      ],
    },
    ToolRegistry,
    ToolExecutor,
  ],
  exports: [AiAdvisorService],
})
export class AiAdvisorModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AddYieldVaultUseCase } from './use-cases/add-yield-vault.use-case';
import { CreateVaultUseCase } from './use-cases/create-vault.use-case';
import { DeleteVaultUseCase } from './use-cases/delete-vault.use-case';
import { DepositVaultUseCase } from './use-cases/deposit-vault.use-case';
import { ExecuteVaultAiActionUseCase } from './use-cases/execute-vault-ai-action.use-case';
import { ExecuteVaultAiCommandUseCase } from './use-cases/execute-vault-ai-command.use-case';
import { GetVaultHistoryUseCase } from './use-cases/get-vault-history.use-case';
import { GetVaultsSummaryUseCase } from './use-cases/get-vaults-summary.use-case';
import { GetVaultsUseCase } from './use-cases/get-vaults.use-case';
import { UpdateVaultUseCase } from './use-cases/update-vault.use-case';
import { WithdrawVaultUseCase } from './use-cases/withdraw-vault.use-case';
import { VaultsController } from './vaults.controller';
import { VaultsRepositoryInterface } from './vaults.interface';
import { VaultsRepository } from './vaults.repository';

@Module({
  imports: [PrismaModule],
  controllers: [VaultsController],
  providers: [
    GetVaultsUseCase,
    CreateVaultUseCase,
    GetVaultHistoryUseCase,
    GetVaultsSummaryUseCase,
    UpdateVaultUseCase,
    DeleteVaultUseCase,
    DepositVaultUseCase,
    WithdrawVaultUseCase,
    AddYieldVaultUseCase,
    ExecuteVaultAiCommandUseCase,
    ExecuteVaultAiActionUseCase,
    {
      provide: VaultsRepositoryInterface,
      useClass: VaultsRepository,
    },
  ],
  exports: [ExecuteVaultAiCommandUseCase],
})
export class VaultsModule {}

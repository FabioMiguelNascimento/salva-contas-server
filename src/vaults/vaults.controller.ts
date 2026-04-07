import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { IdempotencyInterceptor } from 'src/idempotency/idempotency.interceptor';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import {
  CreateVaultInput,
  CreateVaultSchema,
  GetVaultHistoryInput,
  GetVaultHistorySchema,
  UpdateVaultInput,
  UpdateVaultSchema,
  VaultAiActionInput,
  VaultAiActionSchema,
  VaultAiCommandInput,
  VaultAiCommandSchema,
  VaultAmountInput,
  VaultAmountSchema,
} from 'src/schemas/vaults.schema';
import { success } from 'src/utils/api-response-helper';
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

@Controller('vaults')
export class VaultsController {
  constructor(
    private readonly getVaultsUseCase: GetVaultsUseCase,
    private readonly createVaultUseCase: CreateVaultUseCase,
    private readonly getVaultHistoryUseCase: GetVaultHistoryUseCase,
    private readonly getVaultsSummaryUseCase: GetVaultsSummaryUseCase,
    private readonly updateVaultUseCase: UpdateVaultUseCase,
    private readonly deleteVaultUseCase: DeleteVaultUseCase,
    private readonly depositVaultUseCase: DepositVaultUseCase,
    private readonly withdrawVaultUseCase: WithdrawVaultUseCase,
    private readonly addYieldVaultUseCase: AddYieldVaultUseCase,
    private readonly executeVaultAiCommandUseCase: ExecuteVaultAiCommandUseCase,
    private readonly executeVaultAiActionUseCase: ExecuteVaultAiActionUseCase,
  ) {}

  @Get()
  async findAll() {
    const vaults = await this.getVaultsUseCase.execute();
    return success(vaults, 'Cofrinhos recuperados com sucesso');
  }

  @Get('summary')
  async getSummary() {
    const summary = await this.getVaultsSummaryUseCase.execute();
    return success(summary, 'Resumo dos cofrinhos recuperado com sucesso');
  }

  @Post('ai-command')
  @UseInterceptors(IdempotencyInterceptor)
  async aiCommand(
    @Body(new ZodValidationPipe(VaultAiCommandSchema))
    input: VaultAiCommandInput,
  ) {
    const result = await this.executeVaultAiCommandUseCase.execute(input);
    return success(result, 'Comando de IA executado com sucesso');
  }

  @Post()
  @UseInterceptors(IdempotencyInterceptor)
  async create(
    @Body(new ZodValidationPipe(CreateVaultSchema)) data: CreateVaultInput,
  ) {
    const vault = await this.createVaultUseCase.execute(data);
    return success(vault, 'Cofrinho criado com sucesso');
  }

  @Patch(':id')
  @UseInterceptors(IdempotencyInterceptor)
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateVaultSchema)) data: UpdateVaultInput,
  ) {
    const vault = await this.updateVaultUseCase.execute(id, data);
    return success(vault, 'Cofrinho atualizado com sucesso');
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.deleteVaultUseCase.execute(id);
    return success(null, 'Cofrinho removido com sucesso');
  }

  @Post(':id/deposit')
  @UseInterceptors(IdempotencyInterceptor)
  async deposit(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(VaultAmountSchema)) data: VaultAmountInput,
  ) {
    const vault = await this.depositVaultUseCase.execute(id, data);
    return success(vault, 'Valor guardado com sucesso');
  }

  @Post(':id/withdraw')
  @UseInterceptors(IdempotencyInterceptor)
  async withdraw(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(VaultAmountSchema)) data: VaultAmountInput,
  ) {
    const vault = await this.withdrawVaultUseCase.execute(id, data);
    return success(vault, 'Resgate realizado com sucesso');
  }

  @Post(':id/yield')
  @UseInterceptors(IdempotencyInterceptor)
  async addYield(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(VaultAmountSchema)) data: VaultAmountInput,
  ) {
    const vault = await this.addYieldVaultUseCase.execute(id, data);
    return success(vault, 'Rendimento registrado com sucesso');
  }

  @Get(':id/history')
  async getHistory(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(GetVaultHistorySchema))
    query: GetVaultHistoryInput,
  ) {
    const history = await this.getVaultHistoryUseCase.execute(id, query);
    return success(history, 'Histórico do cofrinho recuperado com sucesso');
  }
}

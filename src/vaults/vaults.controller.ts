import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import { success } from 'src/utils/api-response-helper';
import {
    CreateVaultInput,
    CreateVaultSchema,
    GetVaultHistoryInput,
    GetVaultHistorySchema,
    UpdateVaultInput,
    UpdateVaultSchema,
    VaultAmountInput,
    VaultAmountSchema,
} from '../schemas/vaults.schema';
import { VaultsService } from './vaults.service';

@Controller('vaults')
export class VaultsController {
  constructor(private readonly vaultsService: VaultsService) {}

  @Get()
  async findAll() {
    const vaults = await this.vaultsService.findAll();
    return success(vaults, 'Cofrinhos recuperados com sucesso');
  }

  @Get('summary')
  async getSummary() {
    const summary = await this.vaultsService.getSummary();
    return success(summary, 'Resumo dos cofrinhos recuperado com sucesso');
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateVaultSchema)) data: CreateVaultInput,
  ) {
    const vault = await this.vaultsService.create(data);
    return success(vault, 'Cofrinho criado com sucesso');
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateVaultSchema)) data: UpdateVaultInput,
  ) {
    const vault = await this.vaultsService.update(id, data);
    return success(vault, 'Cofrinho atualizado com sucesso');
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.vaultsService.remove(id);
    return success(null, 'Cofrinho removido com sucesso');
  }

  @Post(':id/deposit')
  async deposit(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(VaultAmountSchema)) data: VaultAmountInput,
  ) {
    const vault = await this.vaultsService.deposit(id, data);
    return success(vault, 'Valor guardado com sucesso');
  }

  @Post(':id/withdraw')
  async withdraw(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(VaultAmountSchema)) data: VaultAmountInput,
  ) {
    const vault = await this.vaultsService.withdraw(id, data);
    return success(vault, 'Resgate realizado com sucesso');
  }

  @Post(':id/yield')
  async addYield(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(VaultAmountSchema)) data: VaultAmountInput,
  ) {
    const vault = await this.vaultsService.addYield(id, data);
    return success(vault, 'Rendimento registrado com sucesso');
  }

  @Get(':id/history')
  async getHistory(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(GetVaultHistorySchema))
    query: GetVaultHistoryInput,
  ) {
    const history = await this.vaultsService.getHistory(id, query);
    return success(history, 'Histórico do cofrinho recuperado com sucesso');
  }
}

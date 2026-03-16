import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
    CreateDebitCardInput,
    CreateDebitCardSchema,
    GetDebitCardsInput,
    GetDebitCardsSchema,
    UpdateDebitCardInput,
    UpdateDebitCardSchema,
} from '../schemas/debit-cards.schema';
import { success } from '../utils/api-response-helper';
import { CreateDebitCardUseCase } from './use-cases/create-debit-card.use-case';
import { DeleteDebitCardUseCase } from './use-cases/delete-debit-card.use-case';
import { GetDebitCardByIdUseCase } from './use-cases/get-debit-card-by-id.use-case';
import { GetDebitCardsUseCase } from './use-cases/get-debit-cards.use-case';
import { UpdateDebitCardUseCase } from './use-cases/update-debit-card.use-case';

@Controller('debit-cards')
export class DebitCardsController {
  constructor(
    private readonly createDebitCardUseCase: CreateDebitCardUseCase,
    private readonly getDebitCardsUseCase: GetDebitCardsUseCase,
    private readonly getDebitCardByIdUseCase: GetDebitCardByIdUseCase,
    private readonly updateDebitCardUseCase: UpdateDebitCardUseCase,
    private readonly deleteDebitCardUseCase: DeleteDebitCardUseCase,
  ) {}

  @Post()
  async createDebitCard(
    @Body(new ZodValidationPipe(CreateDebitCardSchema)) data: CreateDebitCardInput,
  ) {
    const debitCard = await this.createDebitCardUseCase.execute(data);
    return success(debitCard, 'Cartão de débito criado com sucesso');
  }

  @Get()
  async getDebitCards(
    @Query(new ZodValidationPipe(GetDebitCardsSchema)) filters: GetDebitCardsInput,
  ) {
    const debitCards = await this.getDebitCardsUseCase.execute(filters);
    return success(debitCards, 'Cartões de débito recuperados com sucesso');
  }

  @Get(':id')
  async getDebitCardById(@Param('id') id: string) {
    const debitCard = await this.getDebitCardByIdUseCase.execute(id);
    if (!debitCard) {
      return success(null, 'Cartão de débito não encontrado');
    }
    return success(debitCard, 'Cartão de débito recuperado com sucesso');
  }

  @Put(':id')
  async updateDebitCard(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateDebitCardSchema)) data: UpdateDebitCardInput,
  ) {
    const debitCard = await this.updateDebitCardUseCase.execute(id, data);
    return success(debitCard, 'Cartão de débito atualizado com sucesso');
  }

  @Delete(':id')
  async deleteDebitCard(@Param('id') id: string) {
    await this.deleteDebitCardUseCase.execute(id);
    return success(null, 'Cartão de débito deletado com sucesso');
  }
}

import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CreateCreditCardInput, CreateCreditCardSchema, GetCreditCardsInput, GetCreditCardsSchema, UpdateCreditCardInput, UpdateCreditCardSchema } from '../schemas/credit-cards.schema';
import { success } from '../utils/api-response-helper';
import { CreateCreditCardUseCase } from './use-cases/create-credit-card.use-case';
import { DeleteCreditCardUseCase } from './use-cases/delete-credit-card.use-case';
import { GetCreditCardByIdUseCase } from './use-cases/get-credit-card-by-id.use-case';
import { GetCreditCardSummaryUseCase } from './use-cases/get-credit-card-summary.use-case';
import { GetCreditCardsUseCase } from './use-cases/get-credit-cards.use-case';
import { UpdateCreditCardUseCase } from './use-cases/update-credit-card.use-case';

@Controller('credit-cards')
export class CreditCardsController {
  constructor(
    private readonly createCreditCardUseCase: CreateCreditCardUseCase,
    private readonly getCreditCardsUseCase: GetCreditCardsUseCase,
    private readonly getCreditCardByIdUseCase: GetCreditCardByIdUseCase,
    private readonly updateCreditCardUseCase: UpdateCreditCardUseCase,
    private readonly deleteCreditCardUseCase: DeleteCreditCardUseCase,
    private readonly getCreditCardSummaryUseCase: GetCreditCardSummaryUseCase,
  ) {}

  @Post()
  async createCreditCard(
    @Body(new ZodValidationPipe(CreateCreditCardSchema)) data: CreateCreditCardInput,
  ) {
    const creditCard = await this.createCreditCardUseCase.execute(data);
    return success(creditCard, 'Cartão de crédito criado com sucesso');
  }

  @Get()
  async getCreditCards(
    @Query(new ZodValidationPipe(GetCreditCardsSchema)) filters: GetCreditCardsInput,
  ) {
    const creditCards = await this.getCreditCardsUseCase.execute(filters);
    return success(creditCards, 'Cartões de crédito recuperados com sucesso');
  }

  @Get(':id')
  async getCreditCardById(@Param('id') id: string) {
    const creditCard = await this.getCreditCardByIdUseCase.execute(id);
    if (!creditCard) {
      return success(null, 'Cartão de crédito não encontrado');
    }
    return success(creditCard, 'Cartão de crédito recuperado com sucesso');
  }

  @Get(':id/summary')
  async getCreditCardSummary(@Param('id') id: string) {
    const summary = await this.getCreditCardSummaryUseCase.execute(id);
    return success(summary, 'Resumo do cartão de crédito recuperado com sucesso');
  }

  @Put(':id')
  async updateCreditCard(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateCreditCardSchema)) data: UpdateCreditCardInput,
  ) {
    const creditCard = await this.updateCreditCardUseCase.execute(id, data);
    return success(creditCard, 'Cartão de crédito atualizado com sucesso');
  }

  @Delete(':id')
  async deleteCreditCard(@Param('id') id: string) {
    await this.deleteCreditCardUseCase.execute(id);
    return success(null, 'Cartão de crédito deletado com sucesso');
  }
}
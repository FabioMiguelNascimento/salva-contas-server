import {
    Body,
    Controller,
    Delete,
    Get,
    Logger,
    Param,
    Patch,
    Post,
    Query,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IdempotencyInterceptor } from 'src/idempotency/idempotency.interceptor';
import { PlanTier } from 'generated/prisma/enums';
import { AllowedPlans } from 'src/auth/decorators/allowed-plans.decorator';
import { RequirePlanGuard } from 'src/auth/guards/require-plan.guard';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import {
    ConfirmTransactionInput,
    ConfirmTransactionSchema,
    GetPendingBillsInput,
    GetPendingBillsSchema,
    GetTransactionsInput,
    GetTransactionsSchema,
    UpdateTransactionInput,
    UpdateTransactionSchema,
} from 'src/schemas/transactions.schema';
import { success, successWithPagination } from 'src/utils/api-response-helper';
import { ConfirmTransactionUseCase } from './use-cases/confirm-transaction.use-case';
import { DeleteTransactionUseCase } from './use-cases/delete-transaction.use-case';
import { GetInstallmentTransactionsUseCase } from './use-cases/get-installment-transactions.use-case';
import GetPendingBillsUseCase from './use-cases/get-pending-bills.use-case';
import GetTransactionsUseCase from './use-cases/get-transactions.use-case';
import ProcessTransactionUseCase from './use-cases/process-transaction.use-case';
import { UpdateTransactionUseCase } from './use-cases/update-transaction.use-case';

@Controller('transactions')
export class TransactionsController {
  private readonly logger = new Logger(TransactionsController.name);

  constructor(
    private readonly processTransactionUseCase: ProcessTransactionUseCase,
    private readonly confirmTransactionUseCase: ConfirmTransactionUseCase,
    private readonly getTransactionsUseCase: GetTransactionsUseCase,
    private readonly getPendingBillsUseCase: GetPendingBillsUseCase,
    private readonly getInstallmentTransactionsUseCase: GetInstallmentTransactionsUseCase,
    private readonly updateTransactionUseCase: UpdateTransactionUseCase,
    private readonly deleteTransactionUseCase: DeleteTransactionUseCase,
  ) {}

  @Post('confirm')
  @UseInterceptors(IdempotencyInterceptor)
  async confirmTransactions(
    @Body(new ZodValidationPipe(ConfirmTransactionSchema))
    data: ConfirmTransactionInput,
  ) {
    const result = await this.confirmTransactionUseCase.execute(data as any);
    return success(result, 'Transação(s) confirmada(s) com sucesso');
  }

  @Post()
  @UseGuards(RequirePlanGuard)
  @AllowedPlans(PlanTier.PRO, PlanTier.FAMILY)
  @UseInterceptors(IdempotencyInterceptor, FileInterceptor('file'))
  async processTransaction(
    @Body('text') body: string,
    @Body('creditCardId') creditCardId: string | null,
    @Body('debitCardId') debitCardId: string | null,
    @Body('paymentDate') paymentDate: string | null,
    @Body('dueDate') dueDate: string | null,
    @Body('installments') installments: number | null,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const data = await this.processTransactionUseCase.execute(file, body, {
      creditCardId,
      debitCardId,
      paymentDate,
      dueDate,
      installments,
    });

    return success(data, 'Transaction processed successfully');
  }

  @Get(':id/installments')
  async getInstallmentTransactions(@Param('id') id: string) {
    const installments =
      await this.getInstallmentTransactionsUseCase.execute(id);

    return success(installments, 'Parcelas encontradas');
  }

  @Get('pending-bills')
  async getPendingBills(
    @Query(new ZodValidationPipe(GetPendingBillsSchema))
    filters: GetPendingBillsInput,
  ) {
    const result = await this.getPendingBillsUseCase.execute(filters);

    return success(result, 'Contas a pagar recuperadas com sucesso');
  }

  @Get()
  async getTransactions(
    @Query(new ZodValidationPipe(GetTransactionsSchema))
    filters: GetTransactionsInput,
  ) {
    const result = await this.getTransactionsUseCase.execute(filters);

    return successWithPagination(
      result.data,
      result.meta,
      'Transações recuperadas com sucesso',
    );
  }

  @Patch(':id')
  @UseInterceptors(IdempotencyInterceptor)
  async updateTransaction(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateTransactionSchema))
    data: UpdateTransactionInput,
  ) {
    const transaction = await this.updateTransactionUseCase.execute(id, data);

    return success(transaction, 'Transação atualizada com sucesso');
  }

  @Delete(':id')
  async deleteTransaction(@Param('id') id: string) {
    await this.deleteTransactionUseCase.execute(id);

    return success(null, 'Transação deletada com sucesso');
  }
}

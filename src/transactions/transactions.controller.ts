import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import { CreateTransactionInput, CreateTransactionSchema, GetTransactionsInput, GetTransactionsSchema, UpdateTransactionInput, UpdateTransactionSchema } from 'src/schemas/transactions.schema';
import { success, successWithPagination } from 'src/utils/api-response-helper';
import CreateManualTransactionUseCase from './use-cases/create-manual-transaction.use-case';
import { DeleteTransactionUseCase } from './use-cases/delete-transaction.use-case';
import GetTransactionsUseCase from './use-cases/get-transactions.use-case';
import ProcessTransactionUseCase from './use-cases/process-transaction.use-case';
import { UpdateTransactionUseCase } from './use-cases/update-transaction.use-case';

@Controller('transactions')
export class TransactionsController {
    constructor(
        private readonly processTransactionUseCase: ProcessTransactionUseCase,
        private readonly createManualTransactionUseCase: CreateManualTransactionUseCase,
        private readonly getTransactionsUseCase: GetTransactionsUseCase,
        private readonly updateTransactionUseCase: UpdateTransactionUseCase,
        private readonly deleteTransactionUseCase: DeleteTransactionUseCase,
    ) {}

    @Post()
    @UseInterceptors(FileInterceptor('file'))
    async processTransaction(
        @Body("text") body: string,
        @UploadedFile() file: Express.Multer.File,
    ) {
        const data = await this.processTransactionUseCase.execute(file, body);

        return success(data, "Transaction processed successfully");
    }   

    @Post('manual')
    async createManualTransaction(
        @Body(new ZodValidationPipe(CreateTransactionSchema)) data: CreateTransactionInput,
    ) {
        const transaction = await this.createManualTransactionUseCase.execute(data);

        return success(transaction, "Transação criada com sucesso");
    }

    @Get()
    async getTransactions(
        @Query(new ZodValidationPipe(GetTransactionsSchema)) filters: GetTransactionsInput,
    ) {
        const result = await this.getTransactionsUseCase.execute(filters);

        return successWithPagination(result.data, result.meta, "Transações recuperadas com sucesso");
    }

    @Patch(':id')
    async updateTransaction(
        @Param('id') id: string,
        @Body(new ZodValidationPipe(UpdateTransactionSchema)) data: UpdateTransactionInput,
    ) {
        const transaction = await this.updateTransactionUseCase.execute(id, data);

        return success(transaction, "Transação atualizada com sucesso");
    }

    @Delete(':id')
    async deleteTransaction(@Param('id') id: string) {
        await this.deleteTransactionUseCase.execute(id);

        return success(null, "Transação deletada com sucesso");
    }
}

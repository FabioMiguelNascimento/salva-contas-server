import { Body, Controller, Post, UploadedFile, UseInterceptors, UsePipes } from '@nestjs/common';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import { AIReceiptSchema } from 'src/schemas/transactions.schema';
import { success } from 'src/utils/api-response-helper';
import { FileInterceptor, MulterModule } from '@nestjs/platform-express';
import ProcessTransactionUseCase from './use-cases/process-transaction.use-case';

@Controller('transactions')
export class TransactionsController {
    constructor(
        private readonly processTransactionUseCase: ProcessTransactionUseCase,
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
}

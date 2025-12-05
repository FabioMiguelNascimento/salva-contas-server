import { Body, Controller, Get } from '@nestjs/common';
import { GetAllCategoriesInput, GetAllCategoriesSchema } from 'src/schemas/categories.schema';
import GetAllCategoriesUseCase from './use-cases/get-all-categories.use-cases';
import { successWithPagination } from 'src/utils/api-response-helper';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';

@Controller('categories')
export class CategoriesController {
    constructor(private getAllCategoriesUseCase: GetAllCategoriesUseCase) {}

    @Get()
    async getAllCategories(@Body(new ZodValidationPipe(GetAllCategoriesSchema)) data: GetAllCategoriesInput) {
        const paginatedCategories = await this.getAllCategoriesUseCase.execute(data);

        return successWithPagination(
            paginatedCategories.data,
            paginatedCategories.meta,
            'Categorias recuperadas com sucesso'
        );
    }
}

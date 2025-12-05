import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import { GetAllCategoriesInput, GetAllCategoriesSchema, UpdateCategorySchema } from 'src/schemas/categories.schema';
import { BaseCategoryUpdateInput } from 'src/types/categories.type';
import { success, successWithPagination } from 'src/utils/api-response-helper';
import GetAllCategoriesUseCase from './use-cases/get-all-categories.use-cases';
import UpdateCategoryUseCase from './use-cases/update-category.use-case';

@Controller('categories')
export class CategoriesController {
    constructor(
        private getAllCategoriesUseCase: GetAllCategoriesUseCase,
        private updateCategoryUseCase: UpdateCategoryUseCase
    ) {}

    @Get()
    async getAllCategories(@Body(new ZodValidationPipe(GetAllCategoriesSchema)) data: GetAllCategoriesInput) {
        const paginatedCategories = await this.getAllCategoriesUseCase.execute(data);

        return successWithPagination(
            paginatedCategories.data,
            paginatedCategories.meta,
            'Categorias recuperadas com sucesso'
        );
    }

    @Patch(':id')
    async updateCategory(@Body(new ZodValidationPipe(UpdateCategorySchema)) data: BaseCategoryUpdateInput, @Param('id') id: string) {
        const updatedCategory = await this.updateCategoryUseCase.execute(data, id);

        return success(
            updatedCategory,
            'Categoria atualizada com sucesso'
        );
    }
}

import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseInterceptors } from '@nestjs/common';
import { IdempotencyInterceptor } from 'src/idempotency/idempotency.interceptor';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import {
  CreateCategorySchema,
  GetAllCategoriesInput,
  GetAllCategoriesSchema,
  UpdateCategorySchema,
} from 'src/schemas/categories.schema';
import { BaseCategoryCreateInput, BaseCategoryUpdateInput } from 'src/types/categories.type';
import { success, successWithPagination } from 'src/utils/api-response-helper';
import CreateCategoryUseCase from './use-cases/create-category.use-case';
import DeleteCategoryUseCase from './use-cases/delete-category.use-case';
import GetAllCategoriesUseCase from './use-cases/get-all-categories.use-cases';
import UpdateCategoryUseCase from './use-cases/update-category.use-case';

@Controller('categories')
export class CategoriesController {
  constructor(
    private createCategoryUseCase: CreateCategoryUseCase,
    private deleteCategoryUseCase: DeleteCategoryUseCase,
    private getAllCategoriesUseCase: GetAllCategoriesUseCase,
    private updateCategoryUseCase: UpdateCategoryUseCase,
  ) {}

  @Post()
  @UseInterceptors(IdempotencyInterceptor)
  async createCategory(
    @Body(new ZodValidationPipe(CreateCategorySchema))
    data: BaseCategoryCreateInput,
  ) {
    const createdCategory = await this.createCategoryUseCase.execute(data);

    return success(createdCategory, 'Categoria criada com sucesso');
  }

  @Get()
  async getAllCategories(
    @Query(new ZodValidationPipe(GetAllCategoriesSchema))
    data: GetAllCategoriesInput,
  ) {
    const paginatedCategories =
      await this.getAllCategoriesUseCase.execute(data);

    return successWithPagination(
      paginatedCategories.data,
      paginatedCategories.meta,
      'Categorias recuperadas com sucesso',
    );
  }

  @Patch(':id')
  @UseInterceptors(IdempotencyInterceptor)
  async updateCategory(
    @Body(new ZodValidationPipe(UpdateCategorySchema))
    data: BaseCategoryUpdateInput,
    @Param('id') id: string,
  ) {
    const updatedCategory = await this.updateCategoryUseCase.execute(data, id);

    return success(updatedCategory, 'Categoria atualizada com sucesso');
  }

  @Delete(':id')
  async deleteCategory(@Param('id') id: string) {
    const deletedCategory = await this.deleteCategoryUseCase.execute(id);

    return success(deletedCategory, 'Categoria removida com sucesso');
  }
}

import { Category } from 'generated/prisma/client';
import { GetAllCategoriesInput, CreateCategoryInput } from 'src/schemas/categories.schema';
import { BaseCategoryCreateInput, BaseCategoryUpdateInput } from 'src/types/categories.type';

export abstract class CategoriesRepositoryInterface {
  abstract getAllCategories(data: GetAllCategoriesInput);
  abstract createCategory(data: BaseCategoryCreateInput): Promise<Category>;
  abstract findCategoryById(id: string): Promise<Category | null>;
  abstract deleteCategory(id: string): Promise<Category>;
  abstract updateCategory(
    data: BaseCategoryUpdateInput,
    id: string,
  ): Promise<Category>;
}

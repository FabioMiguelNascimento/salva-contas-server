import { Category } from "generated/prisma/client";
import { GetAllCategoriesInput } from "src/schemas/categories.schema";
import { BaseCategoryUpdateInput } from "src/types/categories.type";

export abstract class CategoriesRepositoryInterface {
    abstract getAllCategories(data: GetAllCategoriesInput);
    abstract updateCategory(data: BaseCategoryUpdateInput, id: string): Promise<Category>;
}
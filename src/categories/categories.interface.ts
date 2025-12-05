import { GetAllCategoriesInput } from "src/schemas/categories.schema";

export abstract class CategoriesRepositoryInterface {
    abstract getAllCategories(data: GetAllCategoriesInput);
}
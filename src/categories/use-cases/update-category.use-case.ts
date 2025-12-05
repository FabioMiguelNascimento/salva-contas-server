import { Injectable } from "@nestjs/common";
import { CategoriesRepositoryInterface } from "../categories.interface";
import { CategoryUpdateInput } from "generated/prisma/models";
import { BaseCategoryUpdateInput } from "src/types/categories.type";

@Injectable()
export default class UpdateCategoryUseCase {
    constructor(private readonly categoriesRepository: CategoriesRepositoryInterface) {}

    async execute(data: BaseCategoryUpdateInput, id: string) {
        const updatedCategory = await this.categoriesRepository.updateCategory(data as CategoryUpdateInput, id);

        return updatedCategory;
    }
}
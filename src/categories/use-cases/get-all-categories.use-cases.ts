import { Inject, Injectable } from "@nestjs/common";
import { GetAllCategoriesInput } from "src/schemas/categories.schema";
import { CategoriesRepositoryInterface } from "../categories.interface";

@Injectable()
export default class GetAllCategoriesUseCase {
    constructor(
        private readonly categoriesRepository: CategoriesRepositoryInterface,
    ) {}

    async execute(data: GetAllCategoriesInput) {
        const categories = await this.categoriesRepository.getAllCategories(data);

        return categories;
    }
}
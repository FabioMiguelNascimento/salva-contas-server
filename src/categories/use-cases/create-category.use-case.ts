import { Injectable } from '@nestjs/common';
import { CategoriesRepositoryInterface } from '../categories.interface';
import { BaseCategoryCreateInput } from 'src/types/categories.type';
import { Category } from 'generated/prisma/client';

@Injectable()
export default class CreateCategoryUseCase {
  constructor(
    private readonly categoriesRepository: CategoriesRepositoryInterface,
  ) {}

  async execute(data: BaseCategoryCreateInput): Promise<Category> {
    return this.categoriesRepository.createCategory(data);
  }
}

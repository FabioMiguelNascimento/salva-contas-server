import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Category } from 'generated/prisma/client';
import { CategoriesRepositoryInterface } from '../categories.interface';

@Injectable()
export default class DeleteCategoryUseCase {
  constructor(
    private readonly categoriesRepository: CategoriesRepositoryInterface,
  ) {}

  async execute(id: string): Promise<Category> {
    const category = await this.categoriesRepository.findCategoryById(id);

    if (!category) {
      throw new NotFoundException('Categoria não encontrada.');
    }

    if (category.isGlobal) {
      throw new ForbiddenException('Categorias globais não podem ser excluídas.');
    }

    return this.categoriesRepository.deleteCategory(id);
  }
}

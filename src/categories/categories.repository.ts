import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CategoriesRepositoryInterface } from './categories.interface';
import { GetAllCategoriesInput } from 'src/schemas/categories.schema';
import { Category } from 'generated/prisma/client';
import { BaseCategoryUpdateInput } from 'src/types/categories.type';

@Injectable()
export default class CategoriesRepository extends CategoriesRepositoryInterface {
  constructor(private prisma: PrismaService) {
    super();
  }

async getAllCategories({ limit, cursor }: GetAllCategoriesInput) {
    const categories = await this.prisma.category.findMany({
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { name: 'asc' },
    });

    let nextCursor: string | undefined;
    
    if (categories.length > limit) {
      const nextItem = categories.pop();
      
      nextCursor = categories[categories.length - 1]?.id;
    }

    return {
      data: categories,
      meta: {
        total: categories.length,
        lastCursor: nextCursor,
        hasNextPage: !!nextCursor,
      },
    };
  }

  async updateCategory(data: BaseCategoryUpdateInput, id: string): Promise<Category> {
    const updatedCategory = await this.prisma.category.update({
      where: { id },
      data,
    });

    return updatedCategory;
  }
}

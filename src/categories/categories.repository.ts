import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CategoriesRepositoryInterface } from './categories.interface';
import { GetAllCategoriesInput } from 'src/schemas/categories.schema';

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
}

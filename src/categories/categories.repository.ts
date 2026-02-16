import { Injectable, Scope } from '@nestjs/common';
import { Category } from 'generated/prisma/client';
import { UserContext } from 'src/auth/user-context.service';
import { WorkspaceContext } from 'src/auth/workspace-context.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetAllCategoriesInput } from 'src/schemas/categories.schema';
import { BaseCategoryUpdateInput } from 'src/types/categories.type';
import { CategoriesRepositoryInterface } from './categories.interface';

@Injectable({ scope: Scope.REQUEST })
export default class CategoriesRepository extends CategoriesRepositoryInterface {
  constructor(
    private prisma: PrismaService,
    private userContext: UserContext,
    private workspaceContext: WorkspaceContext,
  ) {
    super();
  }

  private get workspaceId(): string {
    return this.workspaceContext.workspaceId;
  }

  async getAllCategories({ limit, cursor }: GetAllCategoriesInput) {
    const categories = await this.prisma.category.findMany({
      where: {
        OR: [
          { workspaceId: this.workspaceId },
          { isGlobal: true },
        ]
      },
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

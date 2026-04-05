import { ForbiddenException, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { Category } from 'generated/prisma/client';
import { UserContext } from 'src/auth/user-context.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { GetAllCategoriesInput } from 'src/schemas/categories.schema';
import { BaseCategoryCreateInput, BaseCategoryUpdateInput } from 'src/types/categories.type';
import { CategoriesRepositoryInterface } from './categories.interface';

@Injectable({ scope: Scope.REQUEST })
export default class CategoriesRepository extends CategoriesRepositoryInterface {
  constructor(
    private prisma: PrismaService,
    private userContext: UserContext,
  ) {
    super();
  }

  private get userId(): string {
    return this.userContext.userId;
  }

  async getAllCategories({ limit, cursor }: GetAllCategoriesInput) {
    const categories = await this.prisma.category.findMany({
      where: {
        OR: [{ userId: this.userId }, { isGlobal: true }],
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

  async createCategory(data: BaseCategoryCreateInput): Promise<Category> {
    return this.prisma.category.create({
      data: {
        ...data,
        isGlobal: false,
        userId: this.userId,
      },
    });
  }

  async findCategoryById(id: string): Promise<Category | null> {
    return this.prisma.category.findUnique({ where: { id } });
  }

  async deleteCategory(id: string): Promise<Category> {
    const category = await this.prisma.category.findUnique({ where: { id } });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada.');
    }

    if (category.isGlobal) {
      throw new ForbiddenException('Categorias globais não podem ser excluídas.');
    }

    if (category.userId !== this.userId) {
      throw new ForbiddenException('Você não pode excluir esta categoria.');
    }

    return this.prisma.category.delete({ where: { id } });
  }

  async updateCategory(
    data: BaseCategoryUpdateInput,
    id: string,
  ): Promise<Category> {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada.');
    }

    if (category.isGlobal || category.userId !== this.userId) {
      throw new ForbiddenException('Você não pode alterar esta categoria.');
    }

    const updatedCategory = await this.prisma.category.update({
      where: { id },
      data,
    });

    return updatedCategory;
  }
}

import { CategoryCreateInput, CategoryUpdateInput } from 'generated/prisma/models';

export interface BaseCategoryCreateInput extends Omit<
  CategoryCreateInput,
  'id' | 'userId' | 'transactions' | 'isGlobal'
> {}

export interface BaseCategoryUpdateInput extends Omit<
  CategoryUpdateInput,
  'id' | 'userId' | 'transactions'
> {}

import { CategoryUpdateInput } from "generated/prisma/models";

export interface BaseCategoryUpdateInput extends Omit<CategoryUpdateInput, 'id' | 'userId' | 'transactions'> {}
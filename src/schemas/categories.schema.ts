import z from 'zod'

export const GetAllCategoriesSchema = z.object({
    limit: z.coerce.number().min(1, "O limite deve ser pelo menos 1").max(100, "O limite deve ser no máximo 100").optional().default(10),
    cursor: z.string().min(0, "O cursor deve ter pelo menos 0 caracteres").optional(),
})

export type GetAllCategoriesInput = z.infer<typeof GetAllCategoriesSchema>

export const UpdateCategorySchema = z.object({
    name: z.string().min(1).max(255).optional(),
    icon: z.string().min(3).max(50).optional(),
})
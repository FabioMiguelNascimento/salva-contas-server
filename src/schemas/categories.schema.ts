import z from 'zod'

export const GetAllCategoriesSchema = z.object({
    limit: z.number().min(1).max(100),
    cursor: z.string().min(0).optional(),
})

export type GetAllCategoriesInput = z.infer<typeof GetAllCategoriesSchema>

export const UpdateCategorySchema = z.object({
    name: z.string().min(1).max(255).optional(),
    icon: z.string().min(3).max(50).optional(),
})
import z from 'zod'

export const GetAllCategoriesSchema = z.object({
    limit: z.number().min(1).max(100),
    cursor: z.string().min(0).optional(),
})

export type GetAllCategoriesInput = z.infer<typeof GetAllCategoriesSchema>
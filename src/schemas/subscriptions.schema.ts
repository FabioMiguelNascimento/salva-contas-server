import z from 'zod'

export const CreateSubscriptionSchema = z.object({
    description: z.string().min(1),
    amount: z.number().positive(),
    categoryId: z.string().uuid(),
    frequency: z.enum(['weekly', 'monthly', 'yearly']),
    dayOfMonth: z.number().min(1).max(31).optional(),
    dayOfWeek: z.number().min(0).max(6).optional(),
    month: z.number().min(1).max(12).optional(), // Para yearly
})

export const GetAllSubscriptionsSchema = z.object({
    month: z.coerce.number().min(1).max(12).optional(),
    year: z.coerce.number().min(1900).max(2100).optional(),
})

export type CreateSubscriptionInput = z.infer<typeof CreateSubscriptionSchema>
export type GetAllSubscriptionsInput = z.infer<typeof GetAllSubscriptionsSchema>
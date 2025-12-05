import z from 'zod'

export const CreateSubscriptionSchema = z.object({
    description: z.string().min(1),
    amount: z.number().positive(),
    categoryId: z.uuid(),
    frequency: z.enum(['weekly', 'monthly', 'yearly']),
    dayOfMonth: z.number().min(1).max(31).optional(),
    dayOfWeek: z.number().min(0).max(6).optional(),
    month: z.number().min(1).max(12).optional(),
})

export type CreateSubscriptionInput = z.infer<typeof CreateSubscriptionSchema>
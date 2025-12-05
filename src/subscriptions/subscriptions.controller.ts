import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ZodValidationPipe } from "src/common/pipes/zod-validation.pipe";
import { CreateSubscriptionInput, CreateSubscriptionSchema, GetAllSubscriptionsInput, GetAllSubscriptionsSchema, UpdateSubscriptionInput, UpdateSubscriptionSchema } from "src/schemas/subscriptions.schema";
import { success } from "src/utils/api-response-helper";
import { CancelSubscriptionUseCase } from "./use-cases/cancel-subscription.use-case";
import CreateSubscriptionUseCase from "./use-cases/create-subscription.use-case";
import GetAllSubscriptionsUseCase from "./use-cases/get-all-subscriptions.use-case";
import { UpdateSubscriptionUseCase } from "./use-cases/update-subscription.use-case";

@Controller('subscriptions')
export class SubscriptionsController {
    constructor(
        private readonly createSubscriptionUseCase: CreateSubscriptionUseCase,
        private readonly getAllSubscriptionsUseCase: GetAllSubscriptionsUseCase,
        private readonly updateSubscriptionUseCase: UpdateSubscriptionUseCase,
        private readonly cancelSubscriptionUseCase: CancelSubscriptionUseCase,
    ) {}

    @Post()
    async createSubscription(
        @Body(new ZodValidationPipe(CreateSubscriptionSchema)) data: CreateSubscriptionInput,
    ) {
        const subscription = await this.createSubscriptionUseCase.execute(data);

        return success(subscription, "Assinatura criada com sucesso");
    }

    @Get()
    async getAllSubscriptions(
        @Query(new ZodValidationPipe(GetAllSubscriptionsSchema)) filters: GetAllSubscriptionsInput,
    ) {
        const subscriptions = await this.getAllSubscriptionsUseCase.execute(filters);

        return success(subscriptions, "Assinaturas recuperadas com sucesso");
    }

    @Patch(':id')
    async updateSubscription(
        @Param('id') id: string,
        @Body(new ZodValidationPipe(UpdateSubscriptionSchema)) data: UpdateSubscriptionInput,
    ) {
        const subscription = await this.updateSubscriptionUseCase.execute(id, data);

        return success(subscription, "Assinatura atualizada com sucesso");
    }

    @Delete(':id')
    async cancelSubscription(@Param('id') id: string) {
        const subscription = await this.cancelSubscriptionUseCase.execute(id);

        return success(subscription, "Assinatura cancelada com sucesso");
    }
}
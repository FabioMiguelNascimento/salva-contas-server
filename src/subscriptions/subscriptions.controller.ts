import { Controller, Post, Body, Get } from "@nestjs/common";
import { ZodValidationPipe } from "src/common/pipes/zod-validation.pipe";
import { CreateSubscriptionSchema, CreateSubscriptionInput } from "src/schemas/subscriptions.schema";
import CreateSubscriptionUseCase from "./use-cases/create-subscription.use-case";
import GetAllSubscriptionsUseCase from "./use-cases/get-all-subscriptions.use-case";
import { success } from "src/utils/api-response-helper";

@Controller('subscriptions')
export class SubscriptionsController {
    constructor(
        private readonly createSubscriptionUseCase: CreateSubscriptionUseCase,
        private readonly getAllSubscriptionsUseCase: GetAllSubscriptionsUseCase,
    ) {}

    @Post()
    async createSubscription(
        @Body(new ZodValidationPipe(CreateSubscriptionSchema)) data: CreateSubscriptionInput,
    ) {
        const subscription = await this.createSubscriptionUseCase.execute(data);

        return success(subscription, "Assinatura criada com sucesso");
    }

    @Get()
    async getAllSubscriptions() {
        const subscriptions = await this.getAllSubscriptionsUseCase.execute();

        return success(subscriptions, "Assinaturas recuperadas com sucesso");
    }
}
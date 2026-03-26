import {
  Injectable,
  Logger,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { PlanTier } from 'generated/prisma/enums';
import { PrismaService } from 'src/prisma/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class StripeService implements OnModuleInit {
  private stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-01-27ts' as any,
    });
  }

  async handleWebhook(signature: string, rawBody: Buffer) {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    this.logger.log(`Processing event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;

      default:
        this.logger.warn(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  private getPlanFromPrice(priceId: string): PlanTier {
    const pricePro = process.env.STRIPE_PRICE_PRO;
    const priceFamily = process.env.STRIPE_PRICE_FAMILY;

    if (priceId === pricePro) return PlanTier.PRO;
    if (priceId === priceFamily) return PlanTier.FAMILY;

    throw new BadRequestException('ID de Preço inválido ou não configurado.');
  }

  async createCheckoutSession(userId: string, priceId: string) {
    const planTier = this.getPlanFromPrice(priceId);

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      client_reference_id: userId,
      metadata: {
        planTier,
      },
      success_url: `${process.env.FRONTEND_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/precos`,
    });

    return { url: session.url };
  }

  async createPortalSession(stripeCustomerId: string) {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/dashboard`,
    });

    return { url: session.url };
  }

  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ) {
    const userId = session.client_reference_id;
    const stripeCustomerId = session.customer as string;
    const stripeSubscriptionId = session.subscription as string;

    if (!userId) {
      this.logger.error('No userId found in checkout session');
      return;
    }

    const planTier = (session.metadata?.planTier as PlanTier);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        stripeCustomerId,
        stripeSubscriptionId,
        planTier,
      },
    });

    this.logger.log(`User ${userId} upgraded to ${planTier}`);
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const stripeSubscriptionId = subscription.id;
    const planTier = (subscription.metadata?.planTier as PlanTier) || PlanTier.PRO;
    
    const status = subscription.status;

    if (status === 'active') {
      await this.prisma.user.update({
        where: { stripeSubscriptionId },
        data: { planTier },
      });
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const stripeSubscriptionId = subscription.id;

    await this.prisma.user.update({
      where: { stripeSubscriptionId },
      data: {
        planTier: PlanTier.FREE,
        stripeSubscriptionId: null,
      },
    });

    this.logger.log(`Subscription ${stripeSubscriptionId} deleted. User downgraded to FREE.`);
  }
}

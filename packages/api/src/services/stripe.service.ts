import Stripe from 'stripe';
import { PLAN_CONFIGS } from '../models/subscription.model';

export class StripeService {
  private stripe: Stripe;

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }

  async createCustomer(email: string, name: string): Promise<Stripe.Customer> {
    return await this.stripe.customers.create({
      email,
      name,
    });
  }

  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    return await this.stripe.customers.retrieve(customerId) as Stripe.Customer;
  }

  async createSubscription(
    customerId: string,
    priceId: string,
    paymentMethodId: string
  ): Promise<Stripe.Subscription> {
    // Attach payment method to customer
    await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Set as default payment method
    await this.stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Create subscription
    return await this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });
  }

  async updateSubscription(
    subscriptionId: string,
    priceId: string
  ): Promise<Stripe.Subscription> {
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    
    return await this.stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: priceId,
      }],
      proration_behavior: 'create_prorations',
    });
  }

  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true
  ): Promise<Stripe.Subscription> {
    if (cancelAtPeriodEnd) {
      return await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      return await this.stripe.subscriptions.cancel(subscriptionId);
    }
  }

  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return await this.stripe.subscriptions.retrieve(subscriptionId);
  }

  async createPaymentIntent(
    amount: number,
    currency: string = 'usd',
    customerId?: string
  ): Promise<Stripe.PaymentIntent> {
    return await this.stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency,
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
    });
  }

  async getInvoices(customerId: string, limit: number = 10): Promise<Stripe.Invoice[]> {
    const invoices = await this.stripe.invoices.list({
      customer: customerId,
      limit,
    });
    return invoices.data;
  }

  async getUpcomingInvoice(subscriptionId: string): Promise<Stripe.Invoice> {
    return await this.stripe.invoices.retrieveUpcoming({
      subscription: subscriptionId,
    });
  }

  async constructWebhookEvent(
    payload: string | Buffer,
    signature: string
  ): Promise<Stripe.Event> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
    }

    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }

  getPriceIdForPlan(planType: string, interval: 'month' | 'year' = 'month'): string {
    const plan = PLAN_CONFIGS[planType];
    if (!plan || !plan.stripePriceId) {
      throw new Error(`No Stripe price ID configured for plan: ${planType}`);
    }
    
    // For now, we'll use monthly prices. In a real implementation,
    // you'd have separate price IDs for monthly and yearly billing
    return plan.stripePriceId;
  }

  async createPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<Stripe.BillingPortal.Session> {
    return await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }
}
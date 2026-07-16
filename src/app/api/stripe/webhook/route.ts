import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";

function getPlanLimits(): Record<string, { plan: string; limit: number }> {
  return {
    [process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID!]: { plan: "starter", limit: 100 },
    [process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!]: { plan: "pro", limit: 500 },
  };
}

/** Fin de période courante de l'abonnement Stripe (ISO), si disponible. */
function periodEndOf(subscription: Stripe.Subscription): string | null {
  const end = subscription.items.data[0]?.current_period_end;
  return end ? new Date(end * 1000).toISOString() : null;
}

async function findUserIdByCustomer(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  customerId: string
): Promise<string | null> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return profile?.id ?? null;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();
  const PLAN_LIMITS = getPlanLimits();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      const subscriptionId = session.subscription as string;

      if (!userId || !subscriptionId) break;

      const subscription = await getStripe().subscriptions.retrieve(subscriptionId, {
        expand: ["items.data.price"],
      });
      const priceId = subscription.items.data[0]?.price.id;
      const planInfo = PLAN_LIMITS[priceId] ?? { plan: "free", limit: 5 };

      const now = new Date().toISOString();
      await supabaseAdmin
        .from("subscriptions")
        .update({
          plan: planInfo.plan,
          searches_limit: planInfo.limit,
          searches_used: 0,
          period_start: now,
          current_period_end: periodEndOf(subscription),
          stripe_subscription_id: subscriptionId,
          updated_at: now,
        })
        .eq("user_id", userId);

      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const userId = await findUserIdByCustomer(supabaseAdmin, customerId);
      if (!userId) break;

      const priceId = subscription.items.data[0]?.price.id;
      const planInfo = PLAN_LIMITS[priceId] ?? { plan: "free", limit: 5 };

      await supabaseAdmin
        .from("subscriptions")
        .update({
          plan: planInfo.plan,
          searches_limit: planInfo.limit,
          current_period_end: periodEndOf(subscription),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      break;
    }

    case "invoice.paid": {
      // Renouvellement mensuel : nouveau cycle de crédits aligné sur Stripe
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.billing_reason !== "subscription_cycle") break;

      const customerId = invoice.customer as string;
      const userId = await findUserIdByCustomer(supabaseAdmin, customerId);
      if (!userId) break;

      const now = new Date().toISOString();
      await supabaseAdmin
        .from("subscriptions")
        .update({ searches_used: 0, period_start: now, updated_at: now })
        .eq("user_id", userId);

      break;
    }

    case "invoice.payment_failed": {
      // Paiement échoué : retour au plan free tant que la facture n'est pas réglée.
      // Stripe relance automatiquement ; invoice.paid / subscription.updated rétablira le plan.
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      const userId = await findUserIdByCustomer(supabaseAdmin, customerId);
      if (!userId) break;

      await supabaseAdmin
        .from("subscriptions")
        .update({
          plan: "free",
          searches_limit: 5,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const userId = await findUserIdByCustomer(supabaseAdmin, customerId);
      if (!userId) break;

      await supabaseAdmin
        .from("subscriptions")
        .update({
          plan: "free",
          searches_limit: 5,
          stripe_subscription_id: null,
          current_period_end: null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      break;
    }
  }

  return NextResponse.json({ received: true });
}

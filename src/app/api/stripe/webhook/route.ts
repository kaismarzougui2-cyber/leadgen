import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getPlanLimits(): Record<string, { plan: string; limit: number }> {
  return {
    [process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID!]: { plan: "starter", limit: 100 },
    [process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!]: { plan: "pro", limit: 500 },
  };
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature")!;

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

  const supabaseAdmin = getSupabaseAdmin();
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

      const now = new Date().toISOString()
      await supabaseAdmin
        .from("subscriptions")
        .update({
          plan: planInfo.plan,
          searches_limit: planInfo.limit,
          searches_used: 0,
          period_start: now,
          stripe_subscription_id: subscriptionId,
          updated_at: now,
        })
        .eq("user_id", userId);

      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (!profile) break;

      const priceId = subscription.items.data[0]?.price.id;
      const planInfo = PLAN_LIMITS[priceId] ?? { plan: "free", limit: 5 };

      await supabaseAdmin
        .from("subscriptions")
        .update({
          plan: planInfo.plan,
          searches_limit: planInfo.limit,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", profile.id);

      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (!profile) break;

      await supabaseAdmin
        .from("subscriptions")
        .update({
          plan: "free",
          searches_limit: 5,
          stripe_subscription_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", profile.id);

      break;
    }
  }

  return NextResponse.json({ received: true });
}

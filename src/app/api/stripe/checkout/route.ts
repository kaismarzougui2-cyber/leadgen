import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { priceId } = await req.json();

    // Whitelist: only accept known price IDs to prevent arbitrary Stripe calls
    const allowedPriceIds = [
      process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID,
      process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    ].filter(Boolean);

    if (!priceId || !allowedPriceIds.includes(priceId)) {
      return NextResponse.json({ error: "Plan invalide." }, { status: 400 });
    }

    // Récupère ou crée le customer Stripe (service role : la ligne profile
    // peut ne pas exister encore, on upsert)
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    const isNewUser = !profile?.stripe_customer_id;
    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;

      await admin
        .from("profiles")
        .upsert({ id: user.id, stripe_customer_id: customerId }, { onConflict: "id" });
    }

    // URL de retour : configuration explicite prioritaire, jamais l'en-tête seul en prod
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ??
      req.headers.get("origin") ??
      "http://localhost:3000";

    const starterPriceId = process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID;
    const firstMonthCoupon = process.env.STRIPE_STARTER_FIRST_MONTH_COUPON;

    // Appliquer le coupon premier mois uniquement pour les nouveaux utilisateurs sur le plan Starter
    const discounts =
      isNewUser && priceId === starterPriceId && firstMonthCoupon
        ? [{ coupon: firstMonthCoupon }]
        : undefined;

    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard?upgraded=1`,
      cancel_url: `${origin}/pricing`,
      metadata: { supabase_user_id: user.id },
      ...(discounts && { discounts }),
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[checkout] Error:", error);
    return NextResponse.json(
      { error: "Impossible de démarrer le paiement. Réessayez." },
      { status: 500 }
    );
  }
}

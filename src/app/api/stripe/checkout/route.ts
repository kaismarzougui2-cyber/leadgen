import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
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

  // Récupère ou crée le customer Stripe
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  let customerId = profile?.stripe_customer_id;

  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;

    await supabase
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const origin = req.headers.get("origin") ?? "http://localhost:3000";

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard?upgraded=1`,
    cancel_url: `${origin}/pricing`,
    metadata: { supabase_user_id: user.id },
  });

  return NextResponse.json({ url: session.url });
}

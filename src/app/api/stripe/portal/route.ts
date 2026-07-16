import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: "Aucun abonnement actif" }, { status: 400 });
    }

    // URL de retour : configuration explicite prioritaire, jamais l'en-tête seul en prod
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ??
      req.headers.get("origin") ??
      "http://localhost:3000";

    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/account`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("[portal] Error:", error);
    return NextResponse.json(
      { error: "Impossible d'ouvrir le portail de facturation. Réessayez." },
      { status: 500 }
    );
  }
}

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.84.0";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey) {
    logStep("ERROR: STRIPE_SECRET_KEY not set");
    return new Response("Server misconfigured", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  let event: Stripe.Event;
  const body = await req.text();

  if (webhookSecret) {
    const sig = req.headers.get("stripe-signature");
    if (!sig) return new Response("Missing signature", { status: 400 });
    try {
      event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    } catch (err) {
      logStep("Signature verification failed", { error: String(err) });
      return new Response("Invalid signature", { status: 400 });
    }
  } else {
    // No webhook secret configured — parse directly (dev mode)
    event = JSON.parse(body) as Stripe.Event;
  }

  logStep("Event received", { type: event.type, id: event.id });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        const customerEmail = session.customer_details?.email || session.customer_email;
        logStep("Checkout completed", { customerId, subscriptionId, customerEmail });

        if (!customerEmail) break;

        // Find user by email
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", customerEmail)
          .single();

        if (!profile) {
          logStep("No profile found for email", { customerEmail });
          break;
        }

        // Get subscription details from Stripe
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = sub.items.data[0]?.price?.id;

        // Look up tier from price ID
        const { data: tierData } = await supabase
          .from("tier_limits")
          .select("tier")
          .eq("stripe_price_id", priceId)
          .single();

        const tier = tierData?.tier || "pro";

        // Upsert subscription record
        const { error: upsertError } = await supabase
          .from("subscriptions")
          .upsert({
            user_id: profile.id,
            tier,
            status: "active",
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          }, { onConflict: "user_id" });

        if (upsertError) logStep("Upsert error", { error: upsertError });
        else logStep("Subscription activated", { userId: profile.id, tier });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const priceId = sub.items.data[0]?.price?.id;
        logStep("Subscription updated", { customerId, status: sub.status, priceId });

        const { data: tierData } = await supabase
          .from("tier_limits")
          .select("tier")
          .eq("stripe_price_id", priceId)
          .single();

        const tier = tierData?.tier || "pro";
        const isActive = ["active", "trialing"].includes(sub.status);

        const { error } = await supabase
          .from("subscriptions")
          .update({
            tier: isActive ? tier : "free",
            status: isActive ? "active" : sub.status,
            stripe_subscription_id: sub.id,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          })
          .eq("stripe_customer_id", customerId);

        if (error) logStep("Update error", { error });
        else logStep("Subscription record updated", { customerId, tier, status: sub.status });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        logStep("Subscription deleted", { customerId });

        const { error } = await supabase
          .from("subscriptions")
          .update({
            tier: "free",
            status: "cancelled",
            stripe_subscription_id: null,
            current_period_end: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);

        if (error) logStep("Downgrade error", { error });
        else logStep("User downgraded to free", { customerId });
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    logStep("ERROR processing event", { error: String(err) });
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), { status: 500 });
  }
});

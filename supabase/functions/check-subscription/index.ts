import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const url = new URL(req.url);
    const refresh = url.searchParams.get('refresh') === 'true';

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    // Try getClaims first, fall back to getUser for stale tokens
    let userId: string | null = null;
    try {
      const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
      if (!claimsError && claimsData?.claims?.sub) {
        userId = claimsData.claims.sub;
      }
    } catch (claimsErr) {
      logStep("getClaims threw exception", { error: String(claimsErr) });
    }

    if (!userId) {
      try {
        logStep("getClaims failed, trying getUser");
        const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
        if (!userError && userData?.user) {
          userId = userData.user.id;
        }
      } catch (userErr) {
        logStep("getUser threw exception", { error: String(userErr) });
      }
    }

    if (!userId) {
      logStep("Auth failed, returning free tier defaults");
      return new Response(JSON.stringify({
        subscribed: false,
        tier: 'free',
        can_use_own_keys: false,
        chat_messages_used: 0,
        browser_tasks_used: 0,
        code_executions_used: 0,
        chat_messages_limit: 100,
        browser_tasks_limit: 10,
        code_executions_limit: 5,
        app_builds_used: 0,
        app_builds_limit: 3,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Optional forced refresh path — hits Stripe live to reconcile local table.
    if (refresh) {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (stripeKey) {
        try {
          const { data: profile } = await supabaseClient
            .from("profiles").select("id, email").eq("id", userId).single();
          if (profile?.email) {
            const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
            const customers = await stripe.customers.list({ email: profile.email, limit: 1 });
            if (customers.data.length > 0) {
              const subs = await stripe.subscriptions.list({
                customer: customers.data[0].id, status: "active", limit: 1,
              });
              if (subs.data.length > 0) {
                const sub = subs.data[0];
                const priceId = sub.items.data[0].price.id;
                const { data: tierData } = await supabaseClient
                  .from('tier_limits')
                  .select('tier').eq('stripe_price_id', priceId).single();
                if (tierData) {
                  await supabaseClient.from('subscriptions').upsert({
                    user_id: userId,
                    tier: tierData.tier,
                    status: 'active',
                    stripe_customer_id: customers.data[0].id,
                    stripe_subscription_id: sub.id,
                    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
                  }, { onConflict: 'user_id' });
                }
              }
            }
          }
        } catch (e) {
          logStep('Refresh error', { error: String(e) });
        }
      }
    }

    // Read tier/status from local subscriptions table (fast, no Stripe call).
    const { data: subRow } = await supabaseClient
      .from('subscriptions')
      .select('tier, status, current_period_end')
      .eq('user_id', userId)
      .maybeSingle();

    let tier: string = subRow?.tier || 'free';
    const hasActiveSub = subRow?.status === 'active' && tier !== 'free';
    const subscriptionEnd: string | null = subRow?.current_period_end ?? null;
    const canUseOwnKeys = tier === 'lifetime' || tier === 'enterprise';
    logStep("Loaded local subscription", { tier, hasActiveSub });

    // Get usage for current period
    const { data: usageData } = await supabaseClient.rpc('get_user_tier_and_usage', {
      p_user_id: userId
    });

    const result = usageData?.[0] || {
      chat_messages_used: 0,
      browser_tasks_used: 0,
      code_executions_used: 0,
      chat_messages_limit: 100,
      browser_tasks_limit: 10,
      code_executions_limit: 5,
      app_builds_used: 0,
      app_builds_limit: 3,
    };

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      tier,
      subscription_end: subscriptionEnd,
      can_use_own_keys: canUseOwnKeys,
      chat_messages_used: result.chat_messages_used,
      browser_tasks_used: result.browser_tasks_used,
      code_executions_used: result.code_executions_used,
      chat_messages_limit: result.chat_messages_limit,
      browser_tasks_limit: result.browser_tasks_limit,
      code_executions_limit: result.code_executions_limit,
      app_builds_used: result.app_builds_used ?? 0,
      app_builds_limit: result.app_builds_limit ?? 3,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: 'An internal error occurred. Please try again.' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

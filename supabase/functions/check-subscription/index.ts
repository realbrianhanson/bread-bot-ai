import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, returning free tier");
      
      // Get free tier limits
      const { data: tierData } = await supabaseClient
        .from('tier_limits')
        .select('*')
        .eq('tier', 'free')
        .single();
      
      return new Response(JSON.stringify({ 
        subscribed: false,
        tier: 'free',
        can_use_own_keys: false,
        chat_messages_used: 0,
        browser_tasks_used: 0,
        chat_messages_limit: tierData?.chat_messages_per_month || 100,
        browser_tasks_limit: tierData?.browser_tasks_per_month || 10
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    
    const hasActiveSub = subscriptions.data.length > 0;
    let tier = 'free';
    let subscriptionEnd = null;
    let canUseOwnKeys = false;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      const priceId = subscription.items.data[0].price.id;
      logStep("Active subscription found", { subscriptionId: subscription.id, priceId, endDate: subscriptionEnd });
      
      // Map price ID to tier
      const { data: tierData } = await supabaseClient
        .from('tier_limits')
        .select('tier, chat_messages_per_month, browser_tasks_per_month')
        .eq('stripe_price_id', priceId)
        .single();
      
      if (tierData) {
        tier = tierData.tier;
        canUseOwnKeys = tier === 'lifetime';
        logStep("Determined subscription tier", { tier, canUseOwnKeys });
      }
    }

    // Get usage for current period
    const { data: usageData } = await supabaseClient.rpc('get_user_tier_and_usage', {
      p_user_id: user.id
    });

    const result = usageData?.[0] || {
      chat_messages_used: 0,
      browser_tasks_used: 0,
      chat_messages_limit: 100,
      browser_tasks_limit: 10
    };

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      tier,
      subscription_end: subscriptionEnd,
      can_use_own_keys: canUseOwnKeys,
      chat_messages_used: result.chat_messages_used,
      browser_tasks_used: result.browser_tasks_used,
      chat_messages_limit: result.chat_messages_limit,
      browser_tasks_limit: result.browser_tasks_limit
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

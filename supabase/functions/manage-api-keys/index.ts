import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.84.0";
import { encryptSecret, decryptSecret, maskKey } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    let userId: string | null = null;

    // Try getClaims first (fast, no network call)
    try {
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
      if (!claimsError && claimsData?.claims?.sub) {
        userId = claimsData.claims.sub as string;
      }
    } catch (e) {
      console.warn("getClaims failed, falling back to getUser:", e);
    }

    // Fallback to getUser if getClaims failed
    if (!userId) {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (!userError && user?.id) {
          userId = user.id;
        }
      } catch (e) {
        console.warn("getUser also failed:", e);
      }
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, provider, key } = await req.json();

    if (action === "save") {
      if (!provider || !key) {
        return new Response(JSON.stringify({ error: "provider and key are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const encryptedKey = await encryptSecret(key);

      const { error } = await supabase
        .from("api_keys")
        .upsert({
          user_id: userId,
          provider,
          encrypted_key: encryptedKey,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,provider" });

      if (error) {
        console.error("Failed to save API key:", error);
        return new Response(JSON.stringify({ error: "Failed to save API key" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list") {
      const { data, error } = await supabase
        .from("api_keys")
        .select("provider, is_active, encrypted_key")
        .eq("user_id", userId);

      if (error) {
        return new Response(JSON.stringify({ error: "Failed to list keys" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Return provider, active status, and a masked preview (last 4 chars only).
      const keys = await Promise.all(
        (data ?? []).map(async (row: any) => {
          let masked = '';
          try {
            const plain = await decryptSecret(row.encrypted_key);
            masked = maskKey(plain);
          } catch {
            masked = '';
          }
          return { provider: row.provider, is_active: row.is_active, masked };
        }),
      );
      return new Response(JSON.stringify({ keys }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("manage-api-keys error:", error);
    return new Response(
      JSON.stringify({ error: "An internal error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

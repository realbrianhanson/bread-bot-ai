import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple AES-GCM encryption using a server-side secret
const ENCRYPTION_KEY_RAW = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function getEncryptionKey(): Promise<CryptoKey> {
  const keyData = new TextEncoder().encode(ENCRYPTION_KEY_RAW);
  const hashBuffer = await crypto.subtle.digest("SHA-256", keyData);
  return crypto.subtle.importKey("raw", hashBuffer, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encryptKey(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  // Store as base64: iv:ciphertext
  const ivB64 = btoa(String.fromCharCode(...iv));
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
  return `${ivB64}:${ctB64}`;
}

export async function decryptKey(encrypted: string): Promise<string> {
  // If it doesn't contain ":", it's a legacy plaintext key
  if (!encrypted.includes(":")) return encrypted;

  const key = await getEncryptionKey();
  const [ivB64, ctB64] = encrypted.split(":");
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(ctB64), (c) => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

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
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const { action, provider, key } = await req.json();

    if (action === "save") {
      if (!provider || !key) {
        return new Response(JSON.stringify({ error: "provider and key are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const encryptedKey = await encryptKey(key);

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
        .select("provider, is_active")
        .eq("user_id", userId);

      if (error) {
        return new Response(JSON.stringify({ error: "Failed to list keys" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Return only provider names + active status, never the keys
      return new Response(JSON.stringify({ keys: data }), {
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

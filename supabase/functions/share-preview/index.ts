import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token || token.length < 16) {
    return new Response("Missing or invalid token", { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Fetch the shared preview by token
  const { data, error } = await supabase
    .from("shared_previews")
    .select("html_content, title, expires_at")
    .eq("token", token)
    .single();

  if (error || !data) {
    return new Response(
      `<!DOCTYPE html><html><head><title>Not Found</title></head><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#111;color:#fff"><div style="text-align:center"><h1>Preview Not Found</h1><p>This link may have expired or been removed.</p></div></body></html>`,
      { status: 404, headers: { ...corsHeaders, "Content-Type": "text/html" } }
    );
  }

  // Check expiry
  if (new Date(data.expires_at) < new Date()) {
    return new Response(
      `<!DOCTYPE html><html><head><title>Expired</title></head><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#111;color:#fff"><div style="text-align:center"><h1>Preview Expired</h1><p>This shared preview link has expired.</p></div></body></html>`,
      { status: 410, headers: { ...corsHeaders, "Content-Type": "text/html" } }
    );
  }

  // Increment view count (fire-and-forget)
  supabase
    .from("shared_previews")
    .update({ view_count: undefined }) // We'll use raw SQL via RPC instead
    .eq("token", token)
    .then(() => {});
  
  // Actually increment with a raw update
  await supabase.rpc("increment_preview_views", { p_token: token }).catch(() => {});

  // Return the raw HTML page
  return new Response(data.html_content, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
});

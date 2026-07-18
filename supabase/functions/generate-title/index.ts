import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.84.0";
import { LOVABLE_AI_GATEWAY_URL, MODELS, fetchWithTimeout, TIMEOUT_AI_MS } from "../_shared/config.ts";

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
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { message, conversationId } = await req.json();
    if (!message || !conversationId) {
      return new Response(
        JSON.stringify({ error: "message and conversationId required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Only overwrite auto-generated placeholder names, never a user-set title.
    const AUTO_NAME_PATTERNS = [
      /^new chat$/i,
      /^untitled(?: chat)?$/i,
      /^chat\s+\d/i,
      /^chat\s+\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/i,
      /^conversation\s+\d/i,
    ];
    const isAutoName = (n: string | null | undefined) => {
      const s = n?.trim();
      if (!s) return true;
      return AUTO_NAME_PATTERNS.some((p) => p.test(s));
    };

    const cleanTitle = (raw: string) =>
      raw.replace(/^["']|["']$/g, "").trim().slice(0, 50);

    const fallbackTitle = () =>
      cleanTitle(message.split(/\s+/).slice(0, 4).join(" ")) || "New Chat";

    const persistTitle = async (title: string) => {
      const { data: row } = await supabase
        .from("projects")
        .select("name")
        .eq("id", conversationId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!row || !isAutoName(row.name)) return;
      await supabase
        .from("projects")
        .update({ name: title })
        .eq("id", conversationId)
        .eq("user_id", user.id);
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      const fallback = fallbackTitle();
      await persistTitle(fallback);
      return new Response(JSON.stringify({ title: fallback }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetchWithTimeout(
      `${LOVABLE_AI_GATEWAY_URL}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODELS.TITLE,
          messages: [
            {
              role: "system",
              content:
                "Generate a concise 3-5 word title for a chat conversation based on the user's first message. Return ONLY the title, no quotes, no punctuation at the end, no explanation. Examples: 'Landing Page Design', 'Browser Task Setup', 'Lead Scraping Help', 'React Dashboard Build'.",
            },
            { role: "user", content: message.slice(0, 500) },
          ],
        }),
      }, TIMEOUT_AI_MS
    );

    if (!response.ok) {
      const fallback = fallbackTitle();
      await persistTitle(fallback);
      return new Response(JSON.stringify({ title: fallback }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() || "";
    const title = cleanTitle(raw) || fallbackTitle();

    await persistTitle(title);

    return new Response(JSON.stringify({ title }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[generate-title] Error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate title" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

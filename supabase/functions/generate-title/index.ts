import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.84.0";

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      // Fallback: use first 4 words of message
      const fallback = message.split(/\s+/).slice(0, 4).join(" ");
      return new Response(JSON.stringify({ title: fallback }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content:
                "Generate a concise 3-5 word title for a chat conversation based on the user's first message. Return ONLY the title, no quotes, no punctuation at the end, no explanation. Examples: 'Landing Page Design', 'Browser Task Setup', 'Lead Scraping Help', 'React Dashboard Build'.",
            },
            { role: "user", content: message.slice(0, 500) },
          ],
        }),
      }
    );

    if (!response.ok) {
      const fallback = message.split(/\s+/).slice(0, 4).join(" ");
      return new Response(JSON.stringify({ title: fallback }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let title =
      data.choices?.[0]?.message?.content?.trim() ||
      message.split(/\s+/).slice(0, 4).join(" ");

    // Clean up: remove quotes, limit length
    title = title.replace(/^["']|["']$/g, "").slice(0, 50);

    // Update the conversation title
    await supabase
      .from("projects")
      .update({ name: title })
      .eq("id", conversationId)
      .eq("user_id", user.id);

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

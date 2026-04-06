import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userId, event, taskData } = await req.json();

    if (!userId || !event) {
      return new Response(JSON.stringify({ error: "Missing userId or event" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get active webhook endpoints for this user and event
    const { data: webhooks, error } = await supabase
      .from("webhook_endpoints")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .contains("events", [event]);

    if (error) {
      console.error("[DISPATCH-WEBHOOK] Error fetching webhooks:", error);
      return new Response(JSON.stringify({ error: "Failed to fetch webhooks" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!webhooks || webhooks.length === 0) {
      return new Response(JSON.stringify({ message: "No webhooks to dispatch", dispatched: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = {
      event,
      timestamp: new Date().toISOString(),
      data: taskData || {},
    };

    let dispatched = 0;
    const errors: string[] = [];

    for (const webhook of webhooks) {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        // Add HMAC signature if secret is set
        if (webhook.secret) {
          const encoder = new TextEncoder();
          const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(webhook.secret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"]
          );
          const signature = await crypto.subtle.sign(
            "HMAC",
            key,
            encoder.encode(JSON.stringify(payload))
          );
          const hex = Array.from(new Uint8Array(signature))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
          headers["X-Signature-256"] = `sha256=${hex}`;
        }

        // Detect Discord webhook and format accordingly
        const isDiscord = webhook.url.includes("discord.com/api/webhooks");
        const body = isDiscord
          ? JSON.stringify({
              content: null,
              embeds: [
                {
                  title: `🧄 ${event === "task.completed" ? "Task Completed" : event === "task.failed" ? "Task Failed" : event}`,
                  description: taskData?.description || taskData?.task || "A task event occurred",
                  color: event === "task.completed" ? 0x22c55e : event === "task.failed" ? 0xef4444 : 0x6366f1,
                  timestamp: new Date().toISOString(),
                  footer: { text: "GarlicBread.ai" },
                  fields: taskData?.taskId
                    ? [{ name: "Task ID", value: taskData.taskId, inline: true }]
                    : [],
                },
              ],
            })
          : JSON.stringify(payload);

        const response = await fetch(webhook.url, {
          method: "POST",
          headers,
          body,
        });

        if (response.ok) {
          dispatched++;
          await supabase
            .from("webhook_endpoints")
            .update({
              last_triggered_at: new Date().toISOString(),
              failure_count: 0,
              updated_at: new Date().toISOString(),
            })
            .eq("id", webhook.id);
        } else {
          const text = await response.text();
          errors.push(`${webhook.name}: ${response.status} - ${text}`);
          await supabase
            .from("webhook_endpoints")
            .update({
              failure_count: (webhook.failure_count || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq("id", webhook.id);
        }
      } catch (err) {
        errors.push(`${webhook.name}: ${err instanceof Error ? err.message : "Unknown error"}`);
        await supabase
          .from("webhook_endpoints")
          .update({
            failure_count: (webhook.failure_count || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", webhook.id);
      }
    }

    console.log(`[DISPATCH-WEBHOOK] Dispatched ${dispatched}/${webhooks.length}, errors: ${errors.length}`);

    return new Response(
      JSON.stringify({ dispatched, total: webhooks.length, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[DISPATCH-WEBHOOK] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

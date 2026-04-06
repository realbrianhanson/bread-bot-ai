import { createClient } from "npm:@supabase/supabase-js@2.84.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { html, css, js, name, category } = await req.json();

    if (!html && !css) {
      return new Response(JSON.stringify({ error: "No code provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const codeContent = [
      html ? `HTML:\n${html.slice(0, 20000)}` : "",
      css ? `CSS:\n${css.slice(0, 5000)}` : "",
      js ? `JS:\n${js.slice(0, 3000)}` : "",
    ].filter(Boolean).join("\n\n");

    const prompt = `Analyze this website code and extract a reusable design template. I need you to create a DESIGN.md and MARKETING.md that capture everything needed to recreate a page with this same look, feel, and structure — but with different content.

THE WEBSITE CODE:

${codeContent}

Extract and return a JSON object with these fields:

{
  "design_md": "A complete DESIGN.md following this format:
    ## Visual Theme — describe the overall mood, density, and style philosophy
    ## Color Palette — extract every color used, with semantic roles (background, foreground, primary, accent, etc.) as CSS variable tokens
    ## Typography — font families, size hierarchy, weights, letter-spacing
    ## Component Styles — buttons, cards, inputs, nav, with exact CSS properties and states (hover, focus)
    ## Layout — container width, spacing scale, grid patterns, section padding
    ## Depth & Elevation — shadow system, border styles
    ## Do and Do Not — design guardrails specific to this style",

  "marketing_md": "A complete marketing template following this format:
    ## Page Purpose — what this page is designed to achieve
    ## Required Sections — the exact section order with what each section needs (headline pattern, content type, CTA style)
    ## Copywriting Patterns — the headline formulas, benefit language patterns, and tone used
    ## Conversion Elements — CTA placement, social proof type, urgency/scarcity patterns, objection handling approach
    ## Section Details — for each section, describe: what goes here, how many items, what format (cards/list/grid), and example copy structure",

  "preview_colors": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
  "description": "One-sentence description of this template's style and purpose"
}

Return ONLY valid JSON. No markdown backticks. No explanation.`;

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: "Anthropic API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 8000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!claudeResponse.ok) {
      const err = await claudeResponse.text();
      console.error("[extract-template] Claude error:", err);
      return new Response(JSON.stringify({ error: "AI extraction failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const claudeData = await claudeResponse.json();
    const rawText = claudeData.content?.[0]?.text || "";

    let extracted: any;
    try {
      // Try parsing directly, then try extracting JSON from text
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      extracted = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
    } catch {
      console.error("[extract-template] Failed to parse JSON:", rawText.slice(0, 500));
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save to design_templates using service role for insert
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: template, error: insertError } = await serviceClient
      .from("design_templates")
      .insert({
        name: name || "My Template",
        category: category || "Custom",
        description: extracted.description || null,
        design_md: extracted.design_md || "",
        marketing_md: extracted.marketing_md || null,
        preview_colors: extracted.preview_colors || null,
        user_id: user.id,
        is_default: false,
        is_active: true,
        source: "user_created",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[extract-template] Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save template" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ id: template.id, success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[extract-template] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

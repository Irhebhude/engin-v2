import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { aiWithFailover } from "../_shared/ai-failover.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing API key. Include x-api-key header." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Hash the key to compare
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const keyHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    // Look up API key
    const { data: keyRecord, error: keyError } = await supabase
      .from("api_keys")
      .select("*")
      .eq("key_hash", keyHash)
      .eq("is_active", true)
      .single();

    if (keyError || !keyRecord) {
      return new Response(JSON.stringify({ error: "Invalid or inactive API key." }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (keyRecord.credits_remaining <= 0) {
      return new Response(JSON.stringify({ error: "No credits remaining. Please upgrade or add credits." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { query, mode = "default" } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return new Response(JSON.stringify({ error: "query field is required." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("AI backend not configured");

    const systemPrompt = `You are SEARCH-POI Intelligence API v1. Return structured, actionable intelligence.
Respond ONLY in valid JSON with this exact structure:
{
  "answer": "Direct answer text",
  "key_insights": ["insight1", "insight2", "insight3"],
  "recommendations": ["action1", "action2"],
  "confidence_level": 85,
  "sources_used": ["type1", "type2"],
  "mode": "${mode}"
}
Be factual, concise, and business-oriented.`;

    const { response, model } = await aiWithFailover({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
      ],
      chain: "fast",
      stream: false,
      apiKey: LOVABLE_API_KEY,
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI processing failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    // Deduct credit and log usage
    await supabase.from("api_keys").update({
      credits_remaining: keyRecord.credits_remaining - 1,
      total_calls: keyRecord.total_calls + 1,
      last_used_at: new Date().toISOString(),
    }).eq("id", keyRecord.id);

    await supabase.from("api_usage_log").insert({
      api_key_id: keyRecord.id,
      query: query.slice(0, 500),
      mode,
      tokens_used: content.length,
    });

    // Try to parse as JSON, otherwise wrap
    let structured;
    try {
      structured = JSON.parse(content);
    } catch {
      structured = {
        answer: content,
        key_insights: [],
        recommendations: [],
        confidence_level: 75,
        sources_used: ["AI reasoning"],
        mode,
      };
    }

    return new Response(JSON.stringify({
      success: true,
      data: structured,
      meta: {
        model_used: model,
        credits_remaining: keyRecord.credits_remaining - 1,
        powered_by: "SEARCH-POI Engine v1",
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("poi-api error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

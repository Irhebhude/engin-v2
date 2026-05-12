import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { aiWithFailover } from "../_shared/ai-failover.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { full_name, email, category, message } = await req.json();

    if (!full_name || !email || !message) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { response } = await aiWithFailover({
      messages: [
        {
          role: "system",
          content: `You are the SEARCH-POI support assistant. You help users with feedback, bug reports, feature requests, and complaints. 
Always:
1. Acknowledge the user's message warmly
2. Provide a helpful, specific response
3. Suggest next steps if applicable
4. Keep responses concise (2-4 paragraphs max)
Be professional, friendly, and solution-oriented. Sign off as "SEARCH-POI Support Team".`,
        },
        {
          role: "user",
          content: `Category: ${category || "general"}\nFrom: ${full_name}\nMessage: ${message}`,
        },
      ],
      chain: "fast",
      apiKey: LOVABLE_API_KEY,
    });

    let aiReply = "Thank you for your feedback. Our team will review it shortly.";
    if (response.ok) {
      const aiData = await response.json();
      aiReply = aiData.choices?.[0]?.message?.content || aiReply;
    }

    // Store in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from("feedback").insert({
      full_name,
      email,
      category: category || "general",
      message,
      ai_response: aiReply,
    });

    return new Response(JSON.stringify({ ai_response: aiReply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("feedback-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

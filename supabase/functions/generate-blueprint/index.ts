import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiWithFailover } from "../_shared/ai-failover.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    if (type === "image") {
      const { response, model } = await aiWithFailover({
        messages: [
          {
            role: "user",
            content: `Generate a detailed technical blueprint schematic diagram for: ${query}. 
            Style: Engineering blueprint with dark blue background, white/cyan lines, technical annotations, component labels, dimensions, and connection points. 
            Include: circuit layout, component placement, wiring paths, and technical specifications.
            Make it look like a professional CAD/engineering drawing.`,
          },
        ],
        chain: "image",
        apiKey: LOVABLE_API_KEY,
        extraBody: { modalities: ["image", "text"] },
      });

      if (!response.ok) {
        const status = response.status;
        return new Response(JSON.stringify({ error: status === 429 ? "Rate limit exceeded. Please try again shortly." : status === 402 ? "Usage limit reached." : "Image generation failed" }), {
          status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
      const text = data.choices?.[0]?.message?.content || "";

      return new Response(JSON.stringify({ imageUrl, text, model }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Text blueprint generation with failover
    const { response, model } = await aiWithFailover({
      messages: [
        {
          role: "system",
          content: `You are SEARCH-POI Blueprint Generator — an advanced technical blueprint and build instruction system. 
          Generate comprehensive, detailed technical blueprints for building real-world technology devices and systems.
          
          Always structure your response with these sections:
          ## 📋 Overview
          Brief description of the device/system
          
          ## 🔧 Component List
          Detailed bill of materials with quantities, specifications, and estimated costs
          
          ## 📐 Technical Specifications
          Dimensions, power requirements, operating conditions
          
          ## 🔌 Wiring & Connection Diagram
          Text-based connection diagram showing how components connect
          
          ## 🛠️ Step-by-Step Assembly Guide
          Numbered steps with detailed instructions
          
          ## ⚡ Circuit Layout
          Description of PCB layout or circuit connections
          
          ## 🧪 Testing & Calibration
          How to verify the build works correctly
          
          ## ⚠️ Safety Notes
          Important safety considerations
          
          Be technically accurate, detailed, and practical. Use real component part numbers where possible.`,
        },
        { role: "user", content: `Generate a complete technical blueprint for: ${query}` },
      ],
      chain: "balanced",
      stream: true,
      apiKey: LOVABLE_API_KEY,
    });

    if (!response.ok) {
      const status = response.status;
      return new Response(JSON.stringify({ error: status === 429 ? "Rate limit exceeded." : status === 402 ? "Usage limit reached." : "Blueprint generation failed" }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "X-AI-Model": model },
    });
  } catch (e) {
    console.error("Blueprint error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

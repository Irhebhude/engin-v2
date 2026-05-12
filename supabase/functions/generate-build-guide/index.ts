import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiWithFailover } from "../_shared/ai-failover.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    if (!query) {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: generate step image
    if (action === "step_image") {
      const { stepDescription, stepNumber } = await req.json().catch(() => ({ stepDescription: query, stepNumber: 1 }));

      const { response } = await aiWithFailover({
        messages: [
          {
            role: "user",
            content: `Generate a clear, instructional illustration showing this build step for a DIY gadget/accessory project. Step ${stepNumber}: "${stepDescription}". Style: Clean technical illustration, well-lit workshop setting, showing hands working with components, labeled parts. On a clean white background.`,
          },
        ],
        chain: "image",
        apiKey: LOVABLE_API_KEY,
        extraBody: { modalities: ["image", "text"] },
      });

      if (!response.ok) {
        return new Response(JSON.stringify({ error: "Image generation failed" }), {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;

      return new Response(JSON.stringify({ imageUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: generate structured build guide (JSON via tool calling)
    if (action === "structured") {
      const { response, model } = await aiWithFailover({
        messages: [
          {
            role: "system",
            content: `You are an expert DIY builder and instructor. Generate detailed, practical step-by-step build guides for gadgets and accessories. Be specific with real components, measurements, and techniques. Every step must be actionable and safe.`,
          },
          {
            role: "user",
            content: `Create a complete step-by-step build guide for: "${query}". Include materials, tools, and detailed assembly steps.`,
          },
        ],
        chain: "balanced",
        apiKey: LOVABLE_API_KEY,
        extraBody: {
          tools: [
            {
              type: "function",
              function: {
                name: "create_build_guide",
                description: "Create a structured build guide with steps, materials, and tools",
                parameters: {
                  type: "object",
                  properties: {
                    title: { type: "string", description: "Name of the project" },
                    description: { type: "string", description: "Brief overview of what you'll build (1-2 sentences)" },
                    difficulty: { type: "string", enum: ["Beginner", "Intermediate", "Advanced", "Expert"] },
                    estimatedTime: { type: "string", description: "Estimated build time e.g. '2-3 hours'" },
                    materials: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          quantity: { type: "string" },
                          notes: { type: "string" },
                        },
                        required: ["name", "quantity"],
                        additionalProperties: false,
                      },
                    },
                    tools: {
                      type: "array",
                      items: { type: "string" },
                    },
                    steps: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          stepNumber: { type: "number" },
                          title: { type: "string", description: "Short step title" },
                          instruction: { type: "string", description: "Detailed instruction for this step (2-4 sentences)" },
                          tip: { type: "string", description: "Optional pro tip for this step" },
                          warning: { type: "string", description: "Optional safety warning" },
                        },
                        required: ["stepNumber", "title", "instruction"],
                        additionalProperties: false,
                      },
                    },
                    safetyNotes: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                  required: ["title", "description", "difficulty", "estimatedTime", "materials", "tools", "steps", "safetyNotes"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "create_build_guide" } },
        },
      });

      if (!response.ok) {
        const status = response.status;
        return new Response(
          JSON.stringify({
            error:
              status === 429 ? "Rate limit exceeded. Please try again shortly." :
              status === 402 ? "Usage limit reached." :
              "Guide generation failed",
          }),
          { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      console.log("[Build Guide] Model used:", model);

      // Extract tool call arguments
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        try {
          const guide = JSON.parse(toolCall.function.arguments);
          return new Response(JSON.stringify({ success: true, guide, model }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch (e) {
          console.error("Failed to parse tool call:", e);
        }
      }

      // Fallback: try content
      const content = data.choices?.[0]?.message?.content;
      return new Response(JSON.stringify({ success: false, error: "Failed to generate structured guide", raw: content }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: search for related YouTube videos
    const FIRECRAWL_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (FIRECRAWL_KEY) {
      const resp = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FIRECRAWL_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `how to build ${query} DIY tutorial site:youtube.com`,
          limit: 6,
          scrapeOptions: { formats: ["markdown"] },
        }),
      });

      const data = await resp.json();
      const videos = (data.data || [])
        .filter((r: any) => r.url?.includes("youtube.com") || r.url?.includes("youtu.be"))
        .map((r: any) => {
          const url = r.url || "";
          const ytMatch = url.match(/(?:v=|\/)([\w-]{11})/);
          const videoId = ytMatch?.[1] || "";
          return {
            url,
            title: r.title || r.metadata?.title || "",
            description: (r.description || r.metadata?.description || "").slice(0, 200),
            thumbnail: videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "",
            videoId,
            platform: "YouTube",
          };
        })
        .filter((v: any) => v.videoId);

      return new Response(JSON.stringify({ success: true, videos }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, videos: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("build-guide error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

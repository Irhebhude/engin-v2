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
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) throw new Error("FIRECRAWL_API_KEY not configured");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Step 1: Scrape the page
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http")) formattedUrl = `https://${formattedUrl}`;

    const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
    });

    const scrapeData = await scrapeResp.json();
    const markdown = scrapeData?.data?.markdown || scrapeData?.markdown || "";

    if (!markdown) {
      return new Response(JSON.stringify({ error: "Could not extract content from URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const truncated = markdown.slice(0, 8000);

    // Step 2: Summarize with AI + failover
    const { response, model } = await aiWithFailover({
      messages: [
        {
          role: "system",
          content: `You are SEARCH-POI Website Understanding Engine. Analyze the following web page content and provide:

## Summary
A clear, concise summary (3-5 sentences)

## Key Facts
- Bullet points of the most important facts and data

## Key Topics
List the main topics covered

## Trust Assessment
Rate the content reliability: High / Medium / Low with brief reasoning

Be concise and factual.`,
        },
        { role: "user", content: `Analyze this webpage:\n\n${truncated}` },
      ],
      chain: "fast",
      apiKey: LOVABLE_API_KEY,
    });

    if (!response.ok) {
      console.error("AI error:", response.status);
      return new Response(JSON.stringify({ error: "AI summarization failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const summary = aiData.choices?.[0]?.message?.content || "Could not generate summary.";

    return new Response(JSON.stringify({ summary, url: formattedUrl, model }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("summarize-url error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, limit = 20 } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ success: false, error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("News search query:", query);

    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `${query} latest news today`,
        limit,
        tbs: "qdr:w", // Last week for freshness
        scrapeOptions: { formats: ["markdown"] },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Firecrawl error:", data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || "News search failed" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = data.data || [];
    const news = results.map((r: any) => {
      let domain = "";
      try { domain = new URL(r.url || "").hostname.replace("www.", ""); } catch {}

      // Extract a snippet from markdown
      const markdown = r.markdown || "";
      const snippet = markdown
        .replace(/^#+\s.*/gm, "")
        .replace(/!\[.*?\]\(.*?\)/g, "")
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/\n{2,}/g, "\n")
        .trim()
        .slice(0, 300);

      return {
        url: r.url || "",
        title: r.title || r.metadata?.title || "",
        description: r.description || r.metadata?.description || snippet || "",
        domain,
        publishedAt: r.metadata?.publishedAt || r.metadata?.date || null,
        favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
      };
    });

    console.log("News search returned", news.length, "articles");

    return new Response(JSON.stringify({ success: true, news: news.slice(0, limit) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("news-search error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

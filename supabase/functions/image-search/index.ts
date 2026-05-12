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

    console.log("Image search query:", query);

    // Use Firecrawl search with image-focused query
    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `${query} images photos pictures`,
        limit,
        scrapeOptions: { formats: ["markdown", "links"] },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Firecrawl error:", data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || "Image search failed" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract image URLs from results
    const images: any[] = [];
    const results = data.data || [];

    for (const result of results) {
      const sourceUrl = result.url || "";
      const sourceTitle = result.title || result.metadata?.title || "";
      let domain = "";
      try { domain = new URL(sourceUrl).hostname.replace("www.", ""); } catch {}

      // Extract image URLs from markdown content
      const markdown = result.markdown || "";
      const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
      let match;
      while ((match = imgRegex.exec(markdown)) !== null) {
        const imgUrl = match[2];
        if (imgUrl && (imgUrl.startsWith("http") && /\.(jpg|jpeg|png|gif|webp|svg|bmp)/i.test(imgUrl))) {
          images.push({
            url: imgUrl,
            alt: match[1] || sourceTitle,
            sourceUrl,
            sourceTitle,
            domain,
          });
        }
      }

      // Also extract from HTML-style img tags in markdown
      const htmlImgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?/gi;
      while ((match = htmlImgRegex.exec(markdown)) !== null) {
        const imgUrl = match[1];
        if (imgUrl && imgUrl.startsWith("http") && /\.(jpg|jpeg|png|gif|webp|svg|bmp)/i.test(imgUrl)) {
          images.push({
            url: imgUrl,
            alt: match[2] || sourceTitle,
            sourceUrl,
            sourceTitle,
            domain,
          });
        }
      }

      // If no images found from markdown, use og:image or thumbnail approach
      if (images.filter(i => i.sourceUrl === sourceUrl).length === 0 && sourceUrl) {
        images.push({
          url: `https://image.thum.io/get/width/400/${sourceUrl}`,
          alt: sourceTitle,
          sourceUrl,
          sourceTitle,
          domain,
          isThumbnail: true,
        });
      }
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    const unique = images.filter(img => {
      if (seen.has(img.url)) return false;
      seen.add(img.url);
      return true;
    });

    console.log("Image search returned", unique.length, "images");

    return new Response(JSON.stringify({ success: true, images: unique.slice(0, limit) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("image-search error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

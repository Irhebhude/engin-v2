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

    console.log("Video search query:", query);

    // Search for videos across platforms
    const response = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `${query} site:youtube.com OR site:vimeo.com OR site:dailymotion.com OR video`,
        limit,
        scrapeOptions: { formats: ["markdown"] },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Firecrawl error:", data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || "Video search failed" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = data.data || [];
    const videos: any[] = [];

    for (const result of results) {
      const url = result.url || "";
      const title = result.title || result.metadata?.title || "";
      const description = result.description || result.metadata?.description || "";
      let domain = "";
      let platform = "Web";
      let thumbnail = "";
      let videoId = "";

      try { domain = new URL(url).hostname.replace("www.", ""); } catch {}

      // Detect platform and extract video IDs for thumbnails
      if (domain.includes("youtube.com") || domain.includes("youtu.be")) {
        platform = "YouTube";
        const ytMatch = url.match(/(?:v=|\/)([\w-]{11})/);
        if (ytMatch) {
          videoId = ytMatch[1];
          thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        }
      } else if (domain.includes("vimeo.com")) {
        platform = "Vimeo";
        thumbnail = `https://image.thum.io/get/width/480/${url}`;
      } else if (domain.includes("dailymotion.com")) {
        platform = "Dailymotion";
        const dmMatch = url.match(/video\/([\w]+)/);
        if (dmMatch) {
          thumbnail = `https://www.dailymotion.com/thumbnail/video/${dmMatch[1]}`;
        }
      } else {
        thumbnail = `https://image.thum.io/get/width/480/${url}`;
      }

      if (!thumbnail) {
        thumbnail = `https://image.thum.io/get/width/480/${url}`;
      }

      videos.push({
        url,
        title,
        description: description.slice(0, 200),
        thumbnail,
        platform,
        domain,
        videoId,
      });
    }

    console.log("Video search returned", videos.length, "results");

    return new Response(JSON.stringify({ success: true, videos }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("video-search error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

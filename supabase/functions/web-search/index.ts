// Hybrid web search: POI-owned index FIRST, Firecrawl as fallback.
// Results from our index are flagged with `poi_index: true` so the UI can show 🛡️ POI Index.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const POI_THRESHOLD = 5; // if we have >= N strong matches, return POI index only

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, limit = 10 } = await req.json();
    if (!query) {
      return new Response(JSON.stringify({ success: false, error: "Query is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Query POI-owned index first
    const { data: poiResults, error: poiErr } = await supabase
      .rpc("search_poi_index", { query_text: query, result_limit: limit });

    if (poiErr) console.error("POI index error:", poiErr);

    const poiHits = (poiResults || []).map((r: any) => ({
      url: r.url,
      title: r.title,
      description: r.description,
      domain: r.domain,
      trust_score: r.trust_score,
      last_crawled_at: r.last_crawled_at,
      poi_index: true,
      is_priority: r.is_priority,
    }));

    console.log(`POI index returned ${poiHits.length} results for "${query}"`);

    // 2. If POI index has enough strong matches → return ours only
    if (poiHits.length >= POI_THRESHOLD) {
      return new Response(JSON.stringify({
        success: true,
        source: "poi_index",
        data: poiHits,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3. Otherwise fallback to Firecrawl & save what we get into the index
    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      // No fallback available — return whatever POI has
      return new Response(JSON.stringify({
        success: true,
        source: "poi_index_partial",
        data: poiHits,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const fcRes = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit, scrapeOptions: { formats: ["markdown"] } }),
    });

    const fcData = await fcRes.json();
    if (!fcRes.ok) {
      console.error("Firecrawl error:", fcData);
      return new Response(JSON.stringify({
        success: true,
        source: "poi_index_only",
        data: poiHits,
        warning: "Firecrawl fallback unavailable",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const fcResults = (fcData.data || []).map((r: any) => ({
      url: r.url,
      title: r.title || r.metadata?.title || "",
      description: r.description || r.metadata?.description || "",
      domain: (() => { try { return new URL(r.url).hostname; } catch { return ""; } })(),
      poi_index: false,
    }));

    // 4. Save Firecrawl results into the POI index for next time (grows organically)
    if (fcResults.length) {
      const toInsert = fcResults
        .filter((r: any) => r.url && r.title)
        .map((r: any) => ({
          url: r.url,
          domain: r.domain,
          title: r.title.slice(0, 500),
          description: (r.description || "").slice(0, 1000),
          content_md: ((fcData.data || []).find((d: any) => d.url === r.url)?.markdown || "").slice(0, 8000),
          trust_score: r.domain.endsWith(".gov.ng") ? 90 : r.domain.endsWith(".ng") ? 70 : 50,
          country: r.domain.endsWith(".ng") ? "NG" : null,
          last_crawled_at: new Date().toISOString(),
        }));
      if (toInsert.length) {
        await supabase.from("crawled_pages").upsert(toInsert, { onConflict: "url", ignoreDuplicates: false });
      }
    }

    // Merge: POI hits first, then Firecrawl for anything not duplicated
    const seen = new Set(poiHits.map((r: any) => r.url));
    const merged = [...poiHits, ...fcResults.filter((r: any) => !seen.has(r.url))];

    return new Response(JSON.stringify({
      success: true,
      source: "hybrid",
      data: merged.slice(0, limit),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("web-search error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

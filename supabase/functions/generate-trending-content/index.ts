import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get top trending searches
    const { data: trending } = await supabase
      .from("trending_searches")
      .select("query, search_count")
      .order("search_count", { ascending: false })
      .limit(5);

    if (!trending || trending.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No trending topics to generate content for" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const generated = [];

    for (const topic of trending) {
      // Check if content already exists
      const slug = topic.query.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const { data: existing } = await supabase
        .from("trending_content")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (existing) continue;

      // Generate content using Lovable AI
      if (!lovableKey) continue;

      const aiResp = await fetch("https://ai.lovable.dev/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovableKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: "You are an SEO content writer. Generate a comprehensive, informative article about the given topic. Include relevant keywords naturally. Output JSON with fields: title, description (meta description under 160 chars), content (markdown article 500-800 words), keywords (array of 5-8 SEO keywords), category (one of: technology, science, business, lifestyle, education, trending).",
            },
            {
              role: "user",
              content: `Write an SEO-optimized article about: "${topic.query}"`,
            },
          ],
        }),
      });

      if (!aiResp.ok) continue;

      const aiData = await aiResp.json();
      const text = aiData.choices?.[0]?.message?.content || "";
      
      // Parse JSON from response
      let parsed;
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      } catch {
        continue;
      }

      if (!parsed?.title || !parsed?.content) continue;

      // Insert content
      const { error } = await supabase.from("trending_content").insert({
        slug,
        title: parsed.title,
        description: parsed.description || `Learn about ${topic.query} on SEARCH-POI`,
        content: parsed.content,
        category: parsed.category || "trending",
        keywords: parsed.keywords || [topic.query],
      });

      if (!error) generated.push(slug);
    }

    return new Response(
      JSON.stringify({ success: true, generated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating trending content:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

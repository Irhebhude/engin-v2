import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiWithFailover } from "../_shared/ai-failover.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AYRSHARE_API = "https://app.ayrshare.com/api/post";

const ELITE_FOOTER = `

━━━━━━━━━━━━━━━━━━━━━━━━━
🏷️ Asset Status: Pre-Revenue Asset (Newly Built)
📌 SEARCH-POI ENGINE v1 Acquisition Proposal
💰 Asking Price: $12.5M USD (Negotiable)
📞 Phone: +2348114472622
💬 WhatsApp: +2348162719737
📧 Email: prosperirhebhude65@gmail.com
━━━━━━━━━━━━━━━━━━━━━━━━━
#SEARCHPOI #AISearch #TechAcquisition #StartupForSale #AI #InvestInAfrica`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, customPost, mediaUrl } = await req.json();

    const AYRSHARE_KEY = Deno.env.get("AYRSHARE_API_KEY");
    if (!AYRSHARE_KEY) {
      return new Response(JSON.stringify({ error: "AYRSHARE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: generate AI content
    if (action === "generate") {
      const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_KEY) throw new Error("LOVABLE_API_KEY not configured");

      const { response } = await aiWithFailover({
        messages: [
          {
            role: "system",
            content: `You are an elite social media copywriter for SEARCH-POI ENGINE v1, the world's first Intelligent Reasoning Search Engine.
Your goal: Create viral, attention-grabbing posts that attract Nigerian companies, international investors, and tech acquirers.
Rules:
- Write 1 compelling post (150-250 words)
- Use powerful hooks, data points, and urgency
- Include emojis strategically
- Focus on the unique value: AI reasoning engine, African market intelligence, real-time data
- Make it sound like a once-in-a-lifetime investment opportunity
- Vary tone: sometimes professional, sometimes bold, sometimes visionary
- Do NOT include the footer/contact info — it will be appended automatically
- Do NOT include any acquisition details, prices, or contact info
- Output ONLY the post text, nothing else`,
          },
          {
            role: "user",
            content: `Generate a unique elite social media post for SEARCH-POI ENGINE v1 acquisition campaign. Theme: ${
              ["AI Revolution in Africa", "The Future of Search", "Investment Opportunity", "Tech Disruption", "Market Intelligence", "Next Google from Africa"][Math.floor(Math.random() * 6)]
            }. Make it different from typical posts.`,
          },
        ],
        chain: "fast",
        stream: false,
        apiKey: LOVABLE_KEY,
      });

      if (!response.ok) throw new Error("AI generation failed");
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "SEARCH-POI ENGINE v1 — The Future of Intelligent Search";

      // Return content WITH footer for preview
      return new Response(JSON.stringify({ content: content + ELITE_FOOTER }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: post to Ayrshare
    if (action === "post") {
      // Strip any existing footer to prevent duplication, then add exactly one
      let cleanPost = customPost;
      const footerMarker = "━━━━━━━━━━━━━━━━━━━━━━━━━";
      const firstFooterIdx = cleanPost.indexOf(footerMarker);
      if (firstFooterIdx !== -1) {
        cleanPost = cleanPost.substring(0, firstFooterIdx).trim();
      }
      
      const finalPost = cleanPost + ELITE_FOOTER;

      // Only post to platforms that are actually linked
      const platforms = ["facebook", "linkedin"];

      const postBody: any = {
        post: finalPost,
        platforms,
        autoHashtag: true,
      };

      if (mediaUrl && mediaUrl.startsWith("http")) {
        postBody.mediaUrls = [mediaUrl];
      }

      const ayrRes = await fetch(AYRSHARE_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${AYRSHARE_KEY}`,
        },
        body: JSON.stringify(postBody),
      });

      const ayrData = await ayrRes.json();

      // Check for partial success (some platforms succeed, some fail)
      const successPosts = ayrData.postIds?.filter((p: any) => p.status === "success") || [];
      const failedPosts = ayrData.errors?.filter((e: any) => e.status === "error") || [];

      return new Response(JSON.stringify({ 
        success: successPosts.length > 0, 
        data: ayrData,
        summary: {
          succeeded: successPosts.length,
          failed: failedPosts.length,
          platforms: successPosts.map((p: any) => p.platform),
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: get post history
    if (action === "history") {
      const histRes = await fetch("https://app.ayrshare.com/api/history", {
        headers: { Authorization: `Bearer ${AYRSHARE_KEY}` },
      });
      const histData = await histRes.json();
      return new Response(JSON.stringify(histData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ayrshare-post error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Shared helpers for Cloudflare Pages Functions.
// Supports both LOVABLE_API_KEY (Lovable Gateway) and GROQ_API_KEY (direct Groq).

export interface AiEnv {
  LOVABLE_API_KEY?: string;
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  FIRECRAWL_API_KEY?: string;
  NASA_API_KEY?: string;
  GROQ_API_KEY?: string;
}

/**
 * AI gateway helper — tries Lovable first, then Groq directly.
 * When no paid key is available, callers should handle the fallback themselves.
 */
export async function callAi(
  env: AiEnv,
  model: string,
  messages: Array<{ role: string; content: string }>,
  opts: { temperature?: number; max_tokens?: number } = {}
): Promise<string> {
  // Priority 1: Lovable AI Gateway (if configured)
  if (env.LOVABLE_API_KEY) {
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: opts.temperature ?? 0.4,
          max_tokens: opts.max_tokens ?? 2000,
        }),
      });
      if (res.ok) {
        const data = await res.json<any>();
        return data.choices?.[0]?.message?.content ?? "";
      }
    } catch { /* fall through to Groq */ }
  }

  // Priority 2: Groq API directly (free tier, fast)
  if (env.GROQ_API_KEY) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages,
        temperature: opts.temperature ?? 0.4,
        max_tokens: opts.max_tokens ?? 2000,
      }),
    });
    if (!res.ok) throw new Error(`Groq API ${res.status}: ${await res.text().catch(() => "")}`);
    const data = await res.json<any>();
    return data.choices?.[0]?.message?.content ?? "";
  }

  throw new Error("No AI API key configured. Set GROQ_API_KEY (free) or LOVABLE_API_KEY in Cloudflare Pages secrets.");
}

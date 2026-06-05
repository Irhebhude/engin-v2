// Shared helpers for B5 ported edge functions.
export interface AiEnv {
  LOVABLE_API_KEY?: string;
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  FIRECRAWL_API_KEY?: string;
  NASA_API_KEY?: string;
}

// Lovable AI Gateway helper — same contract as supabase/functions/_shared/ai-failover.ts
// but rewritten as a plain fetch call for the Workers runtime. When LOVABLE_API_KEY
// goes away in a follow-up batch, swap the URL/headers for OpenAI/Gemini directly.
export async function callAi(
  env: AiEnv,
  model: string,
  messages: Array<{ role: string; content: string }>,
  opts: { temperature?: number; max_tokens?: number } = {}
): Promise<string> {
  if (!env.LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
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
  if (!res.ok) throw new Error(`AI gateway ${res.status}: ${await res.text()}`);
  const data = await res.json<any>();
  return data.choices?.[0]?.message?.content ?? "";
}

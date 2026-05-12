// Shared AI model failover utility for all edge functions
// Automatically tries multiple models if one hits rate limits (429) or payment (402)

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Model priority chains by use-case
export const MODEL_CHAINS = {
  fast: [
    "google/gemini-3-flash-preview",
    "google/gemini-2.5-flash",
    "google/gemini-2.5-flash-lite",
    "openai/gpt-5-nano",
    "openai/gpt-5-mini",
  ],
  balanced: [
    "google/gemini-3-flash-preview",
    "google/gemini-2.5-flash",
    "openai/gpt-5-mini",
    "google/gemini-2.5-pro",
    "openai/gpt-5",
  ],
  powerful: [
    "google/gemini-2.5-pro",
    "google/gemini-3-pro-preview",
    "openai/gpt-5",
    "openai/gpt-5.2",
    "google/gemini-2.5-flash",
  ],
  image: [
    "google/gemini-2.5-flash-image",
    "google/gemini-3-pro-image-preview",
  ],
} as const;

export type ModelChain = keyof typeof MODEL_CHAINS;

interface FailoverOptions {
  messages: any[];
  chain?: ModelChain;
  stream?: boolean;
  apiKey: string;
  extraBody?: Record<string, any>;
}

interface FailoverResult {
  response: Response;
  model: string;
  attempts: number;
}

/**
 * Calls the AI gateway with automatic model failover.
 * Tries each model in the chain until one succeeds.
 * Retryable statuses: 429 (rate limit), 402 (payment), 503 (unavailable)
 */
export async function aiWithFailover(opts: FailoverOptions): Promise<FailoverResult> {
  const { messages, chain = "fast", stream = false, apiKey, extraBody = {} } = opts;
  const models = MODEL_CHAINS[chain];

  let lastResponse: Response | null = null;
  let attempts = 0;

  for (const model of models) {
    attempts++;
    console.log(`[AI Failover] Trying model: ${model} (attempt ${attempts}/${models.length})`);

    try {
      const response = await fetch(AI_GATEWAY, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          stream,
          ...extraBody,
        }),
      });

      // Success — return immediately
      if (response.ok) {
        console.log(`[AI Failover] Success with model: ${model}`);
        return { response, model, attempts };
      }

      // Retryable errors — try next model
      if ([429, 402, 503].includes(response.status)) {
        console.warn(`[AI Failover] Model ${model} returned ${response.status}, trying next...`);
        lastResponse = response;
        continue;
      }

      // Non-retryable error — return as-is
      console.error(`[AI Failover] Model ${model} returned non-retryable ${response.status}`);
      return { response, model, attempts };
    } catch (err) {
      console.error(`[AI Failover] Model ${model} threw error:`, err);
      lastResponse = new Response(JSON.stringify({ error: "Network error" }), { status: 500 });
      continue;
    }
  }

  // All models exhausted
  console.error(`[AI Failover] All ${models.length} models exhausted`);
  return {
    response: lastResponse || new Response(JSON.stringify({ error: "All AI models unavailable" }), { status: 503 }),
    model: "none",
    attempts,
  };
}

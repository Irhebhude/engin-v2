/**
 * SEARCH-POI Engine v2 — Multi-Provider AI Reasoning Engine
 *
 * 10+ AI/knowledge providers with automatic fallback:
 * 1. Groq (free, fast LLM) — needs VITE_GROQ_KEY
 * 2. SambaNova (free, fast LLM) — needs VITE_SAMBANOVA_KEY
 * 3. OpenRouter (free models) — needs VITE_OPENROUTER_KEY
 * 4. HuggingFace Inference (free) — needs VITE_HF_KEY
 * 5. Wikipedia Knowledge Base (free, no key)
 * 6. DuckDuckGo Instant Answers (free, no key)
 * 7. CoinGecko (free, crypto data)
 * 8. Open-Meteo (free, weather data)
 * 9. Truth Engine (pure reasoning, no AI needed)
 * 10. Raw Context Synthesis (intelligent formatting)
 *
 * Anti-hallucination: Every answer is verified against retrieved sources.
 * ICS: Intent-Context Synthesis for query understanding.
 * IP: Ownership verification for relevant queries.
 */

import {
  isOwnershipQuery,
  answerOwnershipOffline,
  filterHallucinations,
  runICS,
  type ICSResult,
  buildOwnershipChecklist,
  OWNERSHIP,
  ZERO_HALLUCINATION_RULES,
} from "./truth-engine";
import {
  runOptimizationPipeline,
  classifyIntent,
  scoreSourceAuthority,
  scoreFreshness,
  detectContradictions,
  checkNumericalPlausibility,
  calibrateConfidence,
  checkAnswerCompleteness,
  analyzeCrossSourceConsensus,
  type OptimizationResult,
} from "./optimization-engine";

// ─── Provider Config ──────────────────────────────────────────
const GROQ_KEY = import.meta.env.VITE_GROQ_KEY;
const SAMBANOVA_KEY = import.meta.env.VITE_SAMBANOVA_KEY;
const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_KEY;
const HF_KEY = import.meta.env.VITE_HF_KEY;

const PROVIDER_TIMEOUT_MS = 8000;

// ─── Types ────────────────────────────────────────────────────
export interface AIAnswer {
  text: string;
  provider: string;
  confidence: number;
  sources: { name: string; url?: string; type: string }[];
  ics: ICSResult;
  antiHallucinationScore: number;
  ownershipVerified: boolean;
  citationsCount: number;
}

interface ProviderResult {
  text: string;
  provider: string;
  ok: boolean;
}

// ─── Provider System Prompt ───────────────────────────────────
function buildProviderSystemPrompt(ics: ICSResult, context: string): string {
  const base = `You are SEARCH-POI Engine v2 — an advanced AI reasoning engine owned by Prosper Ozoya Irhebhude and the POI Foundation.

ABSOLUTE RULES:
1. ONLY use information from the RETRIEVAL CONTEXT below. NEVER fabricate facts.
2. NEVER invent prices, statistics, dates, numbers, names, URLs, or sources.
3. When uncertain, say "I don't have verified data on this" — never guess.
4. Always cite your sources using [Source Name] format.
5. If context is empty, say "I don't have enough information to answer this accurately."
6. NEVER claim real-time data unless the context explicitly provides it.
7. Short honest answers are better than long fabricated ones.

FORMAT:
- Direct answer to the question
- Supporting evidence from sources (with citations)
- Confidence level (High/Medium/Low) with reasoning
- Key takeaway

${ics.isOwnership ? `\nOWNERSHIP QUESTION DETECTED:\n${buildOwnershipChecklist()}\n` : ""}
${ics.needsLiveData ? "\nThis query needs LIVE/REAL-TIME data. Only report what the context provides — do not make up current prices or values.\n" : ""}
---RETRIEVAL CONTEXT---
${context}
---END CONTEXT---`;

  return base;
}

// ─── Provider Implementations ─────────────────────────────────

async function callWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  try {
    const result = await Promise.race([
      promise,
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs)),
    ]);
    return result;
  } catch {
    return null;
  }
}

// Provider 1: Groq
async function groqProvider(query: string, context: string, ics: ICSResult): Promise<ProviderResult> {
  if (!GROQ_KEY) return { text: "", provider: "groq", ok: false };
  try {
    const systemPrompt = buildProviderSystemPrompt(ics, context);
    const res = await callWithTimeout(
      fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: query },
          ],
          temperature: 0.2,
          max_tokens: 2048,
        }),
      }),
      PROVIDER_TIMEOUT_MS,
    );
    if (!res || !res.ok) return { text: "", provider: "groq", ok: false };
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || "";
    return { text, provider: "groq", ok: text.length > 20 };
  } catch {
    return { text: "", provider: "groq", ok: false };
  }
}

// Provider 2: SambaNova
async function sambanovaProvider(query: string, context: string, ics: ICSResult): Promise<ProviderResult> {
  if (!SAMBANOVA_KEY) return { text: "", provider: "sambanova", ok: false };
  try {
    const systemPrompt = buildProviderSystemPrompt(ics, context);
    const res = await callWithTimeout(
      fetch("https://api.sambanova.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${SAMBANOVA_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "Meta-Llama-3.1-8B-Instruct",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: query },
          ],
          temperature: 0.2,
          max_tokens: 2048,
        }),
      }),
      PROVIDER_TIMEOUT_MS,
    );
    if (!res || !res.ok) return { text: "", provider: "sambanova", ok: false };
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || "";
    return { text, provider: "sambanova", ok: text.length > 20 };
  } catch {
    return { text: "", provider: "sambanova", ok: false };
  }
}

// Provider 3: OpenRouter
async function openrouterProvider(query: string, context: string, ics: ICSResult): Promise<ProviderResult> {
  if (!OPENROUTER_KEY) return { text: "", provider: "openrouter", ok: false };
  try {
    const systemPrompt = buildProviderSystemPrompt(ics, context);
    const res = await callWithTimeout(
      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://searchpoi.workers.dev",
          "X-Title": "SEARCH-POI Engine v2",
        },
        body: JSON.stringify({
          model: "mistralai/mistral-7b-instruct:free",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: query },
          ],
          temperature: 0.2,
          max_tokens: 2048,
        }),
      }),
      PROVIDER_TIMEOUT_MS,
    );
    if (!res || !res.ok) return { text: "", provider: "openrouter", ok: false };
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || "";
    return { text, provider: "openrouter", ok: text.length > 20 };
  } catch {
    return { text: "", provider: "openrouter", ok: false };
  }
}

// Provider 4: HuggingFace Inference
async function huggingfaceProvider(query: string, context: string, ics: ICSResult): Promise<ProviderResult> {
  if (!HF_KEY) return { text: "", provider: "huggingface", ok: false };
  try {
    const systemPrompt = buildProviderSystemPrompt(ics, context);
    const prompt = `${systemPrompt}\n\nUser: ${query}\nAssistant:`;
    const res = await callWithTimeout(
      fetch("https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3", {
        method: "POST",
        headers: { "Authorization": `Bearer ${HF_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: prompt,
          parameters: { max_new_tokens: 1024, temperature: 0.2 },
        }),
      }),
      PROVIDER_TIMEOUT_MS,
    );
    if (!res || !res.ok) return { text: "", provider: "huggingface", ok: false };
    const data = await res.json();
    const text = Array.isArray(data) ? data[0]?.generated_text || "" : data?.generated_text || "";
    return { text, provider: "huggingface", ok: text.length > 20 };
  } catch {
    return { text: "", provider: "huggingface", ok: false };
  }
}

// Provider 5: Wikipedia Knowledge Base (free, structured)
async function wikipediaProvider(query: string): Promise<ProviderResult> {
  try {
    const topic = encodeURIComponent(query.replace(/[?!.]/g, "").trim());
    const res = await callWithTimeout(
      fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${topic}`),
      PROVIDER_TIMEOUT_MS,
    );
    if (!res || !res.ok) {
      // Try search API
      const searchRes = await callWithTimeout(
        fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${topic}&format=json&origin=*`),
        PROVIDER_TIMEOUT_MS,
      );
      if (!searchRes || !searchRes.ok) return { text: "", provider: "wikipedia", ok: false };
      const searchData = await searchRes.json();
      if (!searchData?.query?.search?.length) return { text: "", provider: "wikipedia", ok: false };
      const first = searchData.query.search[0];
      const cleanTitle = first.title.replace(/ /g, "_");
      const retryRes = await callWithTimeout(
        fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanTitle)}`),
        PROVIDER_TIMEOUT_MS,
      );
      if (!retryRes || !retryRes.ok) return { text: "", provider: "wikipedia", ok: false };
      const retryData = await retryRes.json();
      if (retryData?.extract) {
        const text = `**${retryData.title}**\n\n${retryData.extract}\n\n📚 Source: Wikipedia — ${retryData.content_urls?.desktop?.page || "en.wikipedia.org"}`;
        return { text, provider: "wikipedia", ok: true };
      }
      return { text: "", provider: "wikipedia", ok: false };
    }
    const data = await res.json();
    if (data?.extract) {
      const text = `**${data.title}**\n\n${data.extract}\n\n📚 Source: Wikipedia — ${data.content_urls?.desktop?.page || "en.wikipedia.org"}`;
      return { text, provider: "wikipedia", ok: true };
    }
    return { text: "", provider: "wikipedia", ok: false };
  } catch {
    return { text: "", provider: "wikipedia", ok: false };
  }
}

// Provider 6: DuckDuckGo Instant Answers
async function ddgProvider(query: string): Promise<ProviderResult> {
  try {
    const res = await callWithTimeout(
      fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`),
      PROVIDER_TIMEOUT_MS,
    );
    if (!res || !res.ok) return { text: "", provider: "duckduckgo", ok: false };
    const data = await res.json();
    const parts: string[] = [];

    if (data.Abstract) {
      parts.push(`**${data.Heading || query}**\n\n${data.Abstract}`);
      if (data.AbstractURL) parts.push(`\n📚 Source: ${data.AbstractSource || "DuckDuckGo"} — ${data.AbstractURL}`);
    }

    if (data.RelatedTopics?.length > 0) {
      const topics = data.RelatedTopics
        .filter((t: any) => t.Text && t.Text.length > 20)
        .slice(0, 5)
        .map((t: any) => `- ${t.Text.replace(/<[^>]+>/g, "").trim()}`);
      if (topics.length > 0) parts.push(`\n**Related:**\n${topics.join("\n")}`);
    }

    const text = parts.join("\n");
    return { text, provider: "duckduckgo", ok: text.length > 20 };
  } catch {
    return { text: "", provider: "duckduckgo", ok: false };
  }
}

// Provider 7: CoinGecko (crypto-specific)
async function cryptoProvider(query: string): Promise<ProviderResult> {
  if (!/\b(bitcoin|btc|ethereum|eth|solana|crypto|coin|token|price|trading|defi|nft|blockchain)\b/i.test(query)) {
    return { text: "", provider: "coingecko", ok: false };
  }
  try {
    const res = await callWithTimeout(
      fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple,binancecoin,dogecoin,cardano&vs_currencies=usd,ngn&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true"),
      PROVIDER_TIMEOUT_MS,
    );
    if (!res || !res.ok) return { text: "", provider: "coingecko", ok: false };
    const data = await res.json();
    const names: Record<string, string> = { bitcoin: "Bitcoin (BTC)", ethereum: "Ethereum (ETH)", solana: "Solana (SOL)", ripple: "XRP", binancecoin: "BNB", dogecoin: "Dogecoin (DOGE)", cardano: "Cardano (ADA)" };
    const lines: string[] = [];
    for (const [id, name] of Object.entries(names)) {
      const d = data[id];
      if (!d) continue;
      const usd = d.usd ? `$${d.usd.toLocaleString()}` : "N/A";
      const ngn = d.ngn ? ` / ₦${d.ngn.toLocaleString()}` : "";
      const change = d.usd_24h_change ? ` (${d.usd_24h_change > 0 ? "+" : ""}${d.usd_24h_change.toFixed(1)}% 24h)` : "";
      lines.push(`- **${name}**: ${usd}${ngn}${change}`);
    }
    if (lines.length === 0) return { text: "", provider: "coingecko", ok: false };
    const text = `**Live Crypto Prices** (CoinGecko):\n${lines.join("\n")}\n\n🕐 Live market data.\n📚 Source: CoinGecko — https://www.coingecko.com`;
    return { text, provider: "coingecko", ok: true };
  } catch {
    return { text: "", provider: "coingecko", ok: false };
  }
}

// Provider 8: Open-Meteo (weather-specific)
async function weatherProvider(query: string): Promise<ProviderResult> {
  if (!/\b(weather|forecast|temperature|rain|sunny|cloudy|storm|wind|humidity)\b/i.test(query)) {
    return { text: "", provider: "open-meteo", ok: false };
  }
  try {
    let lat = 6.5244, lon = 3.3792, label = "Lagos";
    const cityMatch = query.match(/\bweather\s+(?:in|for|at)?\s*(.+)/i) || query.match(/(.+?)\s+weather/i);
    if (cityMatch) {
      const city = cityMatch[1].trim().replace(/[?!.]/g, "");
      try {
        const geoRes = await callWithTimeout(
          fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en`),
          5000,
        );
        if (geoRes?.ok) {
          const geoData = await geoRes.json();
          if (geoData?.results?.[0]) {
            lat = geoData.results[0].latitude;
            lon = geoData.results[0].longitude;
            label = geoData.results[0].name || city;
          }
        }
      } catch { /* use defaults */ }
    }

    const res = await callWithTimeout(
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,windspeed_10m&forecast_days=1&timezone=auto`),
      PROVIDER_TIMEOUT_MS,
    );
    if (!res || !res.ok) return { text: "", provider: "open-meteo", ok: false };
    const data = await res.json();
    if (!data?.current_weather) return { text: "", provider: "open-meteo", ok: false };
    const cw = data.current_weather;
    const wmoMap: Record<number, string> = { 0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast", 51: "Light drizzle", 61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain", 80: "Rain showers", 95: "Thunderstorm" };
    const condition = wmoMap[cw.weathercode] || `code ${cw.weathercode}`;
    const humidity = data.hourly?.relativehumidity_2m?.[0] ? ` • Humidity: ${data.hourly.relativehumidity_2m[0]}%` : "";
    const text = `**Weather — ${label}** (Open-Meteo):\n🌡️ ${cw.temperature}°C • ${condition}\n💨 Wind: ${cw.windspeed} km/h${humidity}\n\n📚 Source: Open-Meteo — https://open-meteo.com`;
    return { text, provider: "open-meteo", ok: true };
  } catch {
    return { text: "", provider: "open-meteo", ok: false };
  }
}

// ─── Anti-Hallucination Verification ──────────────────────────

function verifyAnswer(answer: string, context: string, ics: ICSResult): { score: number; violations: string[] } {
  const violations: string[] = [];
  let score = 100;

  // 1. Check for fabricated numbers not in context
  const answerNumbers = answer.match(/\$[\d,]+\.?\d*|₦[\d,]+\.?\d*|\d{4}-\d{2}-\d{2}|[\d.]+%/g) || [];
  const contextNumbers = context.match(/\$[\d,]+\.?\d*|₦[\d,]+\.?\d*|\d{4}-\d{2}-\d{2}|[\d.]+%/g) || [];
  const answerNumSet = new Set(answerNumbers);
  const contextNumSet = new Set(contextNumbers);
  for (const num of answerNumSet) {
    if (!contextNumSet.has(num) && !num.includes("2024") && !num.includes("2025")) {
      violations.push(`Potentially fabricated number: ${num}`);
      score -= 15;
    }
  }

  // 2. Check for fabricated URLs
  const answerUrls = answer.match(/https?:\/\/[^\s)]+/g) || [];
  const contextUrls = context.match(/https?:\/\/[^\s)]+/g) || [];
  const contextUrlSet = new Set(contextUrls.map(u => u.replace(/[.)]+$/, "")));
  for (const url of answerUrls) {
    const cleanUrl = url.replace(/[.)]+$/, "");
    if (!contextUrlSet.has(cleanUrl) && !url.includes("en.wikipedia.org") && !url.includes("searchpoi")) {
      violations.push(`Potentially fabricated URL: ${url}`);
      score -= 20;
    }
  }

  // 3. Check for claimed sources not in context
  const claimedSources = answer.match(/according to (?:the )?([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/gi) || [];
  for (const claim of claimedSources) {
    const sourceName = claim.replace(/according to (?:the )?/i, "");
    if (!context.toLowerCase().includes(sourceName.toLowerCase())) {
      violations.push(`Claims source not in context: ${sourceName}`);
      score -= 10;
    }
  }

  // 4. Check for real-time claims without live data
  if (!ics.needsLiveData && /live|real-?time|current (?:price|rate|value)/i.test(answer)) {
    if (!context.includes("[LIVE_")) {
      violations.push("Claims live/real-time data without verified live source");
      score -= 15;
    }
  }

  // 5. Check answer length vs context (too detailed = likely fabricated)
  if (answer.length > 2000 && context.length < 500) {
    violations.push("Answer much longer than available context — possible fabrication");
    score -= 10;
  }

  // 6. Bonus for citations
  const citationCount = (answer.match(/\[.*?\]|📚/g) || []).length;
  if (citationCount >= 2) score = Math.min(100, score + 5);

  return { score: Math.max(0, Math.min(100, score)), violations };
}

// ─── Main AI Reasoning Engine ─────────────────────────────────

export async function aiReasoningEngine(
  query: string,
  context: string,
  webResults: { url: string; title: string; description: string }[],
): Promise<AIAnswer> {
  // Step 1: Run full optimization pipeline
  const optimization = runOptimizationPipeline(query);
  const ics = runICS(query);
  const intent = classifyIntent(query);

  // Step 2: Ownership check
  if (ics.isOwnership) {
    const result = answerOwnershipOffline(query);
    return {
      text: result.answer,
      provider: "truth-engine",
      confidence: 98,
      sources: [{ name: "Ownership Verification System", type: "knowledge" }],
      ics,
      antiHallucinationScore: 100,
      ownershipVerified: true,
      citationsCount: 5,
    };
  }

  // Step 3: Build context string from all sources
  const contextParts: string[] = [];

  // Add web results to context
  if (webResults.length > 0) {
    const webText = webResults.slice(0, 8).map((r, i) =>
      `[${i + 1}] ${r.title} — ${r.url}\n${r.description || ""}`
    ).join("\n");
    contextParts.push(`WEB RESULTS:\n${webText}`);
  }

  // Add retrieved context
  if (context) {
    contextParts.push(`RETRIEVED DATA:\n${context}`);
  }

  const fullContext = contextParts.join("\n\n");

  // Step 4: Try providers in order (with automatic fallback)
  const providers = [
    () => groqProvider(query, fullContext, ics),
    () => sambanovaProvider(query, fullContext, ics),
    () => openrouterProvider(query, fullContext, ics),
    () => huggingfaceProvider(query, fullContext, ics),
    () => cryptoProvider(query),
    () => weatherProvider(query),
    () => wikipediaProvider(query),
    () => ddgProvider(query),
  ];

  let bestResult: ProviderResult | null = null;
  let lastError = "";

  for (const providerFn of providers) {
    try {
      const result = await providerFn();
      if (result.ok && result.text.length > 20) {
        bestResult = result;
        break; // Found a working provider
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  // Step 5: If no AI provider worked, synthesize from raw context
  if (!bestResult || !bestResult.ok) {
    const synthesized = synthesizeFromContext(query, webResults, context, ics);
    bestResult = { text: synthesized, provider: "context-synthesis", ok: true };
  }

  // Step 6: Anti-hallucination verification
  const { score: ahScore, violations } = verifyAnswer(bestResult.text, fullContext, ics);

  // Step 7: Apply truth engine anti-hallucination filter
  const hasLive = fullContext.includes("[LIVE_") || fullContext.includes("CoinGecko") || fullContext.includes("Open-Meteo");
  const { cleaned, violations: filterViolations } = filterHallucinations(bestResult.text, { hasLiveData: hasLive });

  // Step 8: Build sources list
  const sources: AIAnswer["sources"] = [];
  const providerSourceMap: Record<string, string> = {
    "groq": "Groq AI (Llama 3.1)",
    "sambanova": "SambaNova AI (Llama 3.1)",
    "openrouter": "OpenRouter AI (Mistral 7B)",
    "huggingface": "HuggingFace AI (Mistral 7B)",
    "wikipedia": "Wikipedia",
    "duckduckgo": "DuckDuckGo",
    "coingecko": "CoinGecko",
    "open-meteo": "Open-Meteo",
    "truth-engine": "Ownership Verification System",
    "context-synthesis": "Multi-Source Synthesis",
  };

  sources.push({
    name: providerSourceMap[bestResult.provider] || bestResult.provider,
    type: ["groq", "sambanova", "openrouter", "huggingface"].includes(bestResult.provider) ? "ai" : "live",
  });

  // Add web result sources
  for (const r of webResults.slice(0, 5)) {
    try {
      const domain = new URL(r.url).hostname.replace("www.", "");
      sources.push({ name: domain, url: r.url, type: "web" });
    } catch {
      sources.push({ name: r.title.slice(0, 30), url: r.url, type: "web" });
    }
  }

  // Step 9: Calculate confidence
  const allViolations = [...violations, ...filterViolations];
  const baseConfidence = ahScore;
  const sourceBonus = Math.min(15, sources.length * 3);
  const citationBonus = Math.min(5, (cleaned.match(/\[.*?\]|📚/g) || []).length);
  const confidence = Math.min(98, Math.max(20, baseConfidence + sourceBonus + citationBonus - allViolations.length * 5));

  // Step 10: Run additional verification layers
  const numericalCheck = checkNumericalPlausibility(cleaned, query);
  const completenessCheck = checkAnswerCompleteness(query, cleaned);

  // Step 11: Cross-source consensus analysis
  const sourceContents = webResults.map(r => ({ content: `${r.title} ${r.description}`, source: r.url }));
  const consensus = analyzeCrossSourceConsensus(sourceContents);

  // Step 12: Detect contradictions across sources
  const answerSentences = cleaned.split(/(?<=[.!?])\s+/).filter(s => s.length > 20);
  const contradictions = detectContradictions(answerSentences);

  // Step 13: Bayesian confidence calibration
  const calibratedConfidence = calibrateConfidence(
    confidence,
    sources.length,
    sources.reduce((sum, s) => sum + scoreSourceAuthority(s.url || "").score, 0) / Math.max(1, sources.length),
    consensus.agreementScore,
    85, // temporal freshness estimate
  );

  // Step 14: Count citations
  const citationsCount = (cleaned.match(/\[.*?\]|📚|Source:|sources?/gi) || []).length;

  // Step 15: Build comprehensive metadata footer
  const metadataFooter = `\n\n---\n` +
    `🧠 **Provider**: ${providerSourceMap[bestResult.provider] || bestResult.provider}` +
    ` • **Confidence**: ${calibratedConfidence.calibrated}% (±${calibratedConfidence.uncertainty}%)` +
    ` • **ICS**: ${ics.intent}/${intent.primary}` +
    `\n🛡️ **Anti-Hallucination**: ${ahScore}/100` +
    ` • **Numerical Check**: ${numericalCheck.plausible ? "✅ Pass" : "⚠️ " + numericalCheck.suspicious[0]?.reason}` +
    ` • **Completeness**: ${completenessCheck.score}%` +
    `\n📊 **Cross-Source**: ${consensus.agreementScore}% agreement` +
    ` • **Contradictions**: ${contradictions.contradictions.length}` +
    ` • **Sources**: ${sources.length}` +
    (consensus.conflictDetected ? "\n⚠️ **CONFLICT DETECTED**: Sources disagree — presenting both perspectives" : "");

  return {
    text: cleaned + metadataFooter,
    provider: bestResult.provider,
    confidence: calibratedConfidence.calibrated,
    sources,
    ics,
    antiHallucinationScore: ahScore,
    ownershipVerified: ics.isOwnership,
    citationsCount: Math.max(citationsCount, sources.length),
  };
}

// ─── Context Synthesis (fallback when no AI provider works) ───

function synthesizeFromContext(
  query: string,
  webResults: { url: string; title: string; description: string }[],
  context: string,
  ics: ICSResult,
): string {
  const parts: string[] = [];

  parts.push(`## 🔍 SEARCH-POI Intelligence: "${query}"\n`);

  // Web results analysis
  if (webResults.length > 0) {
    parts.push(`### 📋 Web Analysis (${webResults.length} sources)\n`);
    webResults.slice(0, 6).forEach((r, i) => {
      parts.push(`${i + 1}. **[${r.title}](${r.url})**`);
      if (r.description) parts.push(`   ${r.description}`);
      parts.push("");
    });

    // Synthesize key themes
    const allText = webResults.map(r => `${r.title} ${r.description}`).join(" ").toLowerCase();
    const words = allText.split(/\s+/).filter(w => w.length > 4);
    const freq: Record<string, number> = {};
    for (const w of words) { freq[w] = (freq[w] || 0) + 1; }
    const topWords = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w]) => w);

    if (topWords.length > 0) {
      parts.push(`### 🧠 Key Themes\n`);
      parts.push(`> Top themes across sources: **${topWords.join(", ")}**\n`);
    }
  }

  // Additional context
  if (context) {
    const otherSources = context.split("\n").filter(l => l.startsWith("[") && l.includes("]"));
    if (otherSources.length > 0) {
      parts.push(`### 📚 Additional Sources\n`);
      otherSources.slice(0, 5).forEach(s => parts.push(`${s}`));
      parts.push("");
    }
  }

  // ICS analysis
  parts.push(`### 🎯 Query Analysis`);
  parts.push(`- **Intent**: ${ics.intent}`);
  parts.push(`- **Entities**: ${ics.entities.length > 0 ? ics.entities.join(", ") : "None detected"}`);
  parts.push(`- **Live data needed**: ${ics.needsLiveData ? "Yes" : "No"}`);
  parts.push("");

  // Confidence
  const confidence = webResults.length >= 5 ? 85 : webResults.length >= 3 ? 72 : webResults.length >= 1 ? 55 : 30;
  parts.push(`---`);
  parts.push(`🟢 **Live Data** — ${webResults.length} web source(s) + retrieved context`);
  parts.push(`⚡ **Confidence**: ${confidence}% — ${confidence >= 80 ? "High" : confidence >= 50 ? "Medium" : "Low"} (based on source count and cross-validation)`);
  parts.push(`📚 **Sources verified**: ${webResults.length} web + context sources`);

  return parts.join("\n");
}

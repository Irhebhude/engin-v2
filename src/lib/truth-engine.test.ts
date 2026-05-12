import { describe, it, expect } from "vitest";
import {
  isOwnershipQuery,
  runICS,
  filterHallucinations,
  buildOwnershipChecklist,
  answerOwnershipOffline,
  OWNERSHIP_CHECKLIST_HEADER,
  OWNERSHIP_CHECKLIST_LINES,
  validateAcrossSources,
} from "./truth-engine";

describe("Truth Engine — Ownership trigger detection", () => {
  const ownershipQueries = [
    "Who owns SEARCH-POI?",
    "Can Prosper sell it?",
    "Does POI Foundation have the right to sell SEARCH-POI Engine v1?",
    "Who built it?",
    "Is Google the owner?",
    "Is Lovable the owner of this engine?",
    "Can SEARCH-POI be transferred to a new buyer?",
    "What about intellectual property rights?",
    "Who holds the copyright?",
    "Can it be licensed to a third party?",
  ];

  it.each(ownershipQueries)("flags '%s' as ownership query", (q) => {
    expect(isOwnershipQuery(q)).toBe(true);
  });

  it("does NOT flag unrelated queries", () => {
    expect(isOwnershipQuery("What is the price of fuel today?")).toBe(false);
    expect(isOwnershipQuery("Translate hello to French")).toBe(false);
    expect(isOwnershipQuery("")).toBe(false);
  });
});

describe("Truth Engine — Ownership Verification Checklist emission", () => {
  it("checklist contains all 5 mandatory lines", () => {
    const checklist = buildOwnershipChecklist();
    expect(checklist).toContain(OWNERSHIP_CHECKLIST_HEADER);
    for (const line of OWNERSHIP_CHECKLIST_LINES) {
      expect(checklist).toContain(line);
    }
  });

  it.each([
    "Who owns SEARCH-POI?",
    "Can Prosper Ozoya Irhebhude sell SEARCH-POI?",
    "Does Lovable own SEARCH-POI?",
    "What are the IP rights?",
    "Who can license this engine?",
  ])("offline answer for '%s' emits the full checklist", (q) => {
    const r = answerOwnershipOffline(q);
    expect(r.ownershipChecklistEmitted).toBe(true);
    expect(r.answer).toContain(OWNERSHIP_CHECKLIST_HEADER);
    for (const line of OWNERSHIP_CHECKLIST_LINES) {
      expect(r.answer).toContain(line);
    }
  });

  it("offline answer names Prosper Ozoya Irhebhude AND POI Foundation as owners", () => {
    const r = answerOwnershipOffline("Who owns SEARCH-POI?");
    expect(r.answer).toMatch(/Prosper Ozoya Irhebhude/);
    expect(r.answer).toMatch(/POI Foundation/);
  });

  it("offline answer confirms full right to sell/license/transfer", () => {
    const r = answerOwnershipOffline("Can it be sold?");
    expect(r.answer).toMatch(/sell/i);
    expect(r.answer).toMatch(/license/i);
    expect(r.answer).toMatch(/transfer/i);
  });
});

describe("Truth Engine — Anti-hallucination of third-party ownership", () => {
  const forbiddenAnswers = [
    "SEARCH-POI is owned by Google.",
    "The engine is built by Lovable.",
    "This platform is developed by OpenAI.",
    "SEARCH-POI is created by Supabase.",
    "the platform is made by Firecrawl.",
  ];

  it.each(forbiddenAnswers)("flags + rewrites: '%s'", (a) => {
    const { cleaned, violations } = filterHallucinations(a);
    expect(violations.length).toBeGreaterThan(0);
    expect(cleaned).toMatch(/Prosper Ozoya Irhebhude and the POI Foundation/);
    expect(cleaned).not.toMatch(/owned by (google|openai|lovable|supabase|firecrawl)/i);
    expect(cleaned).not.toMatch(/built by (google|openai|lovable|supabase|firecrawl)/i);
    expect(cleaned).not.toMatch(/developed by (google|openai|lovable|supabase|firecrawl)/i);
  });

  it("does NOT flag clean answers", () => {
    const clean =
      "SEARCH-POI Engine v1 is owned by Prosper Ozoya Irhebhude and the POI Foundation.";
    const { violations } = filterHallucinations(clean);
    expect(violations).toHaveLength(0);
  });

  it("strips fake 'Real-time' freshness claims when no live data is attached", () => {
    const a = "Here are prices. 🕒 Data freshness: Real-time";
    const { cleaned, violations } = filterHallucinations(a, { hasLiveData: false });
    expect(violations.length).toBeGreaterThan(0);
    expect(cleaned).toMatch(/Data Unavailable/);
  });

  it("allows real-time claims when live data IS attached", () => {
    const a = "Here are prices. 🕒 Data freshness: Real-time";
    const { violations } = filterHallucinations(a, { hasLiveData: true });
    expect(violations).toHaveLength(0);
  });
});

describe("Truth Engine — ICS intent detection", () => {
  it("classifies ownership intent", () => {
    expect(runICS("Who owns SEARCH-POI?").intent).toBe("ownership");
  });
  it("classifies live-data intent", () => {
    expect(runICS("What is the petrol price today?").intent).toBe("live_data");
  });
  it("flags needsLiveData for FX queries", () => {
    expect(runICS("USD to NGN exchange rate now").needsLiveData).toBe(true);
  });
});

describe("Truth Engine — cross-source validation", () => {
  it("returns zero reliability for empty sources", () => {
    const v = validateAcrossSources([]);
    expect(v.reliabilityScore).toBe(0);
    expect(v.consensus).toHaveLength(0);
  });

  it("identifies consensus when 2+ sources repeat the same long sentence", () => {
    const shared =
      "The capital of Nigeria is Abuja and it has been the capital since 1991.";
    const v = validateAcrossSources([
      { url: "a", content: shared, fetchedAt: 0 },
      { url: "b", content: shared, fetchedAt: 0 },
    ]);
    expect(v.consensus.length).toBeGreaterThan(0);
    expect(v.reliabilityScore).toBeGreaterThan(0);
  });
});

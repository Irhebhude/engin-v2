
# Plan — 3 Tracks

I'll break this into three parallel tracks. Track A ships now in this turn. Tracks B and C are multi-batch and will run after you confirm.

---

## TRACK A — Ship now (single turn)

### A1. NEXUS CORE module at `/nexus`
- New page `src/pages/NexusCore.tsx` with the 5-panel dashboard (Agent Command, Omega Intel Feed, Predictive Simulation, Multi-AI Orchestra, Synthesizer).
- Components under `src/components/nexus/`: `AgentCommandPanel`, `OmegaIntelFeed`, `PredictiveSimulation`, `MultiAIOrchestra`, `SynthesizerOutput`, `ScanLine`, `NexusTopBar`.
- Add `⬡ NEXUS CORE` button to `Header.tsx` (desktop nav + mobile menu) linking to `/nexus`.
- Route in `App.tsx`.
- Cyberpunk styling: `#020810` bg, `#00FFE7` cyan, Orbitron/Space Mono, glass panels, glitch title, scan-line sweep, staggered fade-in, pulsing borders, animated probability bars.
- Backend: 3 Supabase edge functions (`nexus-orchestrate`, `nexus-intel-feed`, `nexus-simulate`) using the Lovable AI Gateway (Gemini 3 Flash for agents, Gemini 2.5 Pro for synthesizer). Streaming SSE for the 5 agents.
- DB migration for 4 tables: `nexus_missions`, `nexus_agent_outputs`, `nexus_memory`, `nexus_intel_feed` with RLS + GRANTs.
- Intel feed polls every 60s. Knowledge depth counter from `nexus_memory` row count.

### A2. Passcode consolidation
- Merge passcode create + change + **Forgot Passcode** flows into the existing `src/pages/SecuritySettings.tsx` (already at `/security`) so all auth/security lives in one place.
- Add "Forgot passcode?" link on `LockScreen.tsx` → triggers recovery via signed-in Supabase email (sends reset code through new `passcode-recovery` edge function using existing auth email).
- Remove standalone setup flow duplication; `SetupLockScreen` only shows on true first launch.

---

## TRACK B — Cloudflare full migration (multi-batch, after A ships)

Replaces Lovable Cloud (Supabase) with Cloudflare stack. Will execute in 6 batches after you say "go":

1. **B1 — Foundation**: `wrangler.toml`, Cloudflare D1 schema (port all 25+ tables), R2 bucket for storage, KV for sessions/cache, Pages project config.
2. **B2 — Auth Worker**: replace Supabase Auth with Cloudflare Workers + `hono/jwt` + D1 users table. Email magic links via Cloudflare Email Routing or Resend. Google OAuth via Worker.
3. **B3 — Data API Worker**: REST/RPC endpoints replacing every `supabase.from(...)` call. Row-level access enforced in Worker middleware (replaces RLS).
4. **B4 — Edge Functions port**: rewrite all `supabase/functions/*` as Cloudflare Workers (search-ai, web-search, image-search, news-search, video-search, summarize-url, generate-blueprint, generate-build-guide, generate-trending-content, feedback-ai, ayrshare-post, poi-api, poi-crawler, plus the new nexus-* trio).
5. **B5 — Client refactor**: new `src/integrations/cloudflare/client.ts` replacing `supabase/client.ts`. Codemod all imports. AuthContext rewritten against Worker JWT.
6. **B6 — Cutover + cleanup**: data export from Supabase → D1 import script, env swap, remove `supabase/` directory, update `.env` to Cloudflare vars, DNS to Pages.

Track B is large (~40–60 files touched per batch). I will NOT start B until A is approved and shipping cleanly, since A still uses Supabase and would need to be re-pointed during B5 anyway.

---

## TRACK C — Page consolidation audit (small, after A)

Audit current routes and merge stragglers into shared parent pages:
- `/security`, `/points`, `/referral`, `/developer` → group under a single `/account` shell with tabs.
- `/live-sources`, `/insights`, `/trending` → group under `/intel` shell.
- Keep deep-link URLs working via redirects.

---

## Technical notes

- NEXUS edge functions use `LOVABLE_API_KEY` (already set), Gemini models, SSE streaming pattern from knowledge doc.
- Critic/Futurist/Strategist/Analyst run in parallel via `Promise.all` inside `nexus-orchestrate`, then Synthesizer runs sequentially with their outputs.
- All NEXUS tables auth-scoped to `auth.uid()` with proper GRANTs (authenticated + service_role; no anon).
- Intel feed table is publicly readable (anon SELECT) since it's global news.
- No new secrets needed — `LOVABLE_API_KEY` covers all AI calls.

---

**Approve this plan** and I'll execute Track A immediately (NEXUS Core + passcode consolidation). Reply "go B" later to start the Cloudflare migration batches.

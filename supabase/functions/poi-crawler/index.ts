// POI Foundation owned crawler — fetches HTML directly, parses it, stores in our index.
// No third-party search API. Respects robots.txt. Triggered manually or via cron.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const USER_AGENT = "SEARCH-POI-Bot/1.0 (+https://search-poi.lovable.app; POI Foundation independent crawler)";

function getDomain(url: string): string {
  try { return new URL(url).hostname.toLowerCase(); } catch { return ""; }
}

function htmlToText(doc: any): { title: string; description: string; content: string; links: string[] } {
  const title = doc.querySelector("title")?.textContent?.trim() || "";
  const description =
    doc.querySelector('meta[name="description"]')?.getAttribute("content") ||
    doc.querySelector('meta[property="og:description"]')?.getAttribute("content") || "";
  // strip script/style/nav
  ["script", "style", "nav", "footer", "noscript"].forEach((tag) =>
    doc.querySelectorAll(tag).forEach((el: any) => el.remove?.())
  );
  const main = doc.querySelector("main") || doc.querySelector("article") || doc.body;
  const content = (main?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 8000);
  const links: string[] = [];
  doc.querySelectorAll("a[href]").forEach((a: any) => {
    const href = a.getAttribute?.("href");
    if (href && !href.startsWith("#") && !href.startsWith("javascript:")) links.push(href);
  });
  return { title: title.slice(0, 500), description: description.slice(0, 1000), content, links };
}

async function checkRobots(supabase: any, domain: string): Promise<{ allowed: boolean; delay: number; disallow: string[] }> {
  const { data: existing } = await supabase
    .from("crawl_domains")
    .select("*")
    .eq("domain", domain)
    .maybeSingle();

  const stale = !existing?.last_robots_check ||
    new Date(existing.last_robots_check).getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000;

  if (existing && !stale) {
    return {
      allowed: !existing.is_blocked && existing.respect_robots,
      delay: existing.crawl_delay_ms || 2000,
      disallow: existing.robots_disallow || [],
    };
  }

  // Fetch robots.txt
  let disallow: string[] = [];
  let delay = 2000;
  try {
    const res = await fetch(`https://${domain}/robots.txt`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const txt = await res.text();
      const lines = txt.split("\n").map((l) => l.trim());
      let currentUA = "";
      let appliesToUs = false;
      for (const line of lines) {
        if (/^user-agent:/i.test(line)) {
          currentUA = line.split(":")[1]?.trim().toLowerCase() || "";
          appliesToUs = currentUA === "*" || currentUA.includes("search-poi");
        } else if (appliesToUs && /^disallow:/i.test(line)) {
          const path = line.split(":")[1]?.trim();
          if (path) disallow.push(path);
        } else if (appliesToUs && /^crawl-delay:/i.test(line)) {
          const d = parseInt(line.split(":")[1]?.trim() || "2", 10);
          if (!Number.isNaN(d)) delay = d * 1000;
        }
      }
    }
  } catch (_e) { /* ignore — no robots.txt is fine */ }

  await supabase.from("crawl_domains").upsert({
    domain,
    respect_robots: true,
    crawl_delay_ms: delay,
    is_blocked: false,
    last_robots_check: new Date().toISOString(),
    robots_disallow: disallow,
  }, { onConflict: "domain" });

  return { allowed: true, delay, disallow };
}

function isPathAllowed(pathname: string, disallow: string[]): boolean {
  for (const rule of disallow) {
    if (rule === "/" || (rule && pathname.startsWith(rule))) return false;
  }
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const batchSize: number = body.batch ?? 5;

    const { data: queue, error: qErr } = await supabase
      .from("crawl_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .order("priority", { ascending: false })
      .order("scheduled_at", { ascending: true })
      .limit(batchSize);

    if (qErr) throw qErr;
    if (!queue?.length) {
      return new Response(JSON.stringify({ success: true, message: "Queue empty", crawled: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];
    for (const job of queue) {
      // mark in_progress
      await supabase.from("crawl_queue").update({ status: "in_progress", attempts: job.attempts + 1 }).eq("id", job.id);

      try {
        const url = new URL(job.url);
        const domain = url.hostname.toLowerCase();
        const robots = await checkRobots(supabase, domain);

        if (!robots.allowed || !isPathAllowed(url.pathname, robots.disallow)) {
          await supabase.from("crawl_queue").update({ status: "failed", last_error: "blocked by robots.txt" }).eq("id", job.id);
          results.push({ url: job.url, status: "robots_blocked" });
          continue;
        }

        const res = await fetch(job.url, {
          headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
          signal: AbortSignal.timeout(15000),
          redirect: "follow",
        });

        if (!res.ok) {
          await supabase.from("crawl_queue").update({ status: "failed", last_error: `HTTP ${res.status}` }).eq("id", job.id);
          results.push({ url: job.url, status: "http_error", code: res.status });
          continue;
        }

        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        if (!doc) {
          await supabase.from("crawl_queue").update({ status: "failed", last_error: "parse error" }).eq("id", job.id);
          continue;
        }

        const { title, description, content, links } = htmlToText(doc);
        const trustScore =
          (domain.endsWith(".gov.ng") ? 90 :
           domain.endsWith(".ng") ? 70 :
           domain.endsWith(".edu") || domain.endsWith(".gov") ? 85 : 50);

        await supabase.from("crawled_pages").upsert({
          url: job.url,
          domain,
          title,
          description,
          content_md: content,
          country: domain.endsWith(".ng") ? "NG" : null,
          trust_score: trustScore,
          last_crawled_at: new Date().toISOString(),
        }, { onConflict: "url" });

        await supabase.from("crawl_queue").update({ status: "done", last_error: null }).eq("id", job.id);

        // Discover new links (only same-domain or .ng) — cap 10/page
        const newLinks = links
          .map((href) => { try { return new URL(href, job.url).toString().split("#")[0]; } catch { return null; } })
          .filter((u): u is string => !!u && u.startsWith("http"))
          .filter((u) => {
            const d = getDomain(u);
            return d === domain || d.endsWith(".ng");
          })
          .slice(0, 10);

        if (newLinks.length) {
          const newRows = newLinks.map((u) => ({
            url: u,
            domain: getDomain(u),
            priority: getDomain(u).endsWith(".gov.ng") ? 8 : 5,
          }));
          await supabase.from("crawl_queue").upsert(newRows, { onConflict: "url", ignoreDuplicates: true });
        }

        results.push({ url: job.url, status: "ok", title: title.slice(0, 60), discovered: newLinks.length });

        // politeness delay
        await new Promise((r) => setTimeout(r, robots.delay));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await supabase.from("crawl_queue").update({ status: "failed", last_error: msg.slice(0, 200) }).eq("id", job.id);
        results.push({ url: job.url, status: "error", error: msg });
      }
    }

    return new Response(JSON.stringify({ success: true, crawled: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("poi-crawler error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

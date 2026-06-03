// Cloudflare Pages Function — healthcheck.
// First brick of the Workers/Pages backend. Lives at /api/health.
// Deployed automatically by Cloudflare Pages from /functions.
export const onRequest: PagesFunction = async () => {
  return new Response(
    JSON.stringify({
      ok: true,
      service: "search-poi-engine-v2",
      runtime: "cloudflare-pages-functions",
      ts: new Date().toISOString(),
    }),
    { headers: { "content-type": "application/json", "cache-control": "no-store" } }
  );
};

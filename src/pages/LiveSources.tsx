import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, Pause, Play, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import LiveIndicator from "@/components/live/LiveIndicator";
import { LIVE_SOURCES, type SourceMeta, relativeTime } from "@/lib/live-sources";

interface SourceState {
  status: "live" | "delayed" | "offline" | "loading";
  fetchedAt: number;
  latencyMs: number;
  count: number;
  error?: string;
}

interface FeedEntry {
  ts: number;
  source: string;
  category: string;
  ok: boolean;
  msg: string;
}

export default function LiveSources() {
  const [states, setStates] = useState<Record<string, SourceState>>({});
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [paused, setPaused] = useState(false);

  const probe = async (s: SourceMeta) => {
    const start = performance.now();
    setStates((p) => ({ ...p, [s.id]: { ...(p[s.id] || { count: 0 }), status: "loading", fetchedAt: 0, latencyMs: 0, count: p[s.id]?.count || 0 } }));
    const r = await s.test();
    const lat = performance.now() - start;
    const status: SourceState["status"] = r.ok ? (lat > 3000 ? "delayed" : "live") : "offline";
    setStates((p) => ({
      ...p,
      [s.id]: {
        status,
        fetchedAt: r.fetchedAt,
        latencyMs: Math.round(lat),
        count: (p[s.id]?.count || 0) + (r.ok ? 1 : 0),
        error: r.error,
      },
    }));
    setFeed((f) =>
      [
        { ts: Date.now(), source: s.name, category: s.category, ok: r.ok, msg: r.ok ? `OK (${Math.round(lat)}ms)` : r.error || "fail" },
        ...f,
      ].slice(0, 100)
    );
  };

  useEffect(() => {
    LIVE_SOURCES.forEach(probe);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (paused) return;
    const i = setInterval(() => {
      LIVE_SOURCES.forEach((s) => {
        const st = states[s.id];
        if (!st || Date.now() - st.fetchedAt > s.refreshSec * 1000) probe(s);
      });
    }, 15000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, states]);

  const liveCount = Object.values(states).filter((s) => s.status === "live").length;
  const total = LIVE_SOURCES.length;

  const exportCsv = () => {
    const rows = [["timestamp", "source", "category", "ok", "message"]].concat(
      feed.map((e) => [new Date(e.ts).toISOString(), e.source, e.category, String(e.ok), e.msg])
    );
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `live-feed-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const grouped = LIVE_SOURCES.reduce<Record<string, SourceMeta[]>>((acc, s) => {
    (acc[s.category] ||= []).push(s);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-foreground">
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link to="/" className="text-xs text-[#00D4FF] hover:underline">
              ← Back
            </Link>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Live Sources Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Real-time public data feeds powering SEARCH-POI Engine v2
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-[#00FF88]/20 text-[#00FF88]">
              ⚡ {liveCount}/{total} LIVE
            </Badge>
            <Button size="sm" variant="outline" onClick={() => LIVE_SOURCES.forEach(probe)}>
              <RefreshCw className="mr-1 h-3 w-3" /> Refresh all
            </Button>
          </div>
        </header>

        {Object.entries(grouped).map(([cat, list]) => (
          <section key={cat}>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-[#00D4FF]">{cat}</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((s) => {
                const st = states[s.id];
                const status = (st?.status ?? "loading") as any;
                return (
                  <Card
                    key={s.id}
                    className="border-[#00D4FF]/10 bg-white/5 p-3 backdrop-blur transition hover:border-[#00D4FF]/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{s.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          Every {s.refreshSec < 60 ? `${s.refreshSec}s` : `${Math.round(s.refreshSec / 60)}m`}
                        </div>
                      </div>
                      <LiveIndicator status={status === "loading" ? "delayed" : status} label={status.toUpperCase()} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{st?.fetchedAt ? relativeTime(st.fetchedAt) : "—"}</span>
                      <span>{st?.latencyMs ? `${st.latencyMs}ms` : ""}</span>
                      <span>✓ {st?.count ?? 0}</span>
                    </div>
                    {st?.error && <div className="mt-1 truncate text-[10px] text-[#FF3B3B]">{st.error}</div>}
                  </Card>
                );
              })}
            </div>
          </section>
        ))}

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#00D4FF]">Live Feed Monitor</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setPaused((p) => !p)}>
                {paused ? <Play className="mr-1 h-3 w-3" /> : <Pause className="mr-1 h-3 w-3" />}
                {paused ? "Resume" : "Pause"}
              </Button>
              <Button size="sm" variant="outline" onClick={exportCsv}>
                <Download className="mr-1 h-3 w-3" /> CSV
              </Button>
            </div>
          </div>
          <Card className="max-h-72 overflow-y-auto border-[#00D4FF]/10 bg-black/40 p-2 font-mono text-[10px]">
            {feed.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">Awaiting events…</div>
            ) : (
              feed.map((e, i) => (
                <div key={i} className="flex items-center gap-2 border-b border-white/5 py-1">
                  <span className="text-muted-foreground">{new Date(e.ts).toLocaleTimeString()}</span>
                  <span className={e.ok ? "text-[#00FF88]" : "text-[#FF3B3B]"}>{e.ok ? "●" : "○"}</span>
                  <span className="text-[#00D4FF]">[{e.category}]</span>
                  <span className="truncate">{e.source}</span>
                  <span className="ml-auto text-muted-foreground">{e.msg}</span>
                </div>
              ))
            )}
          </Card>
        </section>
      </div>
    </div>
  );
}

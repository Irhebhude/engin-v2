import { useEffect, useState } from "react";
import { formatClock, detectLocale, detectTimeZone } from "@/lib/datetime-format";

/**
 * Live worldwide date/time — auto-detects locale + timezone.
 * Nigeria shows WAT (UTC+1), UK/UTC show GMT, everywhere else shows GMT±N.
 * Ticks every second; drift-syncs with /api/time every 60s.
 * Never crashes on unsupported Intl options.
 */
const LiveDateTime = ({ compact = false }: { compact?: boolean }) => {
  const [now, setNow] = useState<Date>(() => new Date());
  const [offsetMs, setOffsetMs] = useState<number>(0);
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  const locale = detectLocale();
  const tz = detectTimeZone();

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date(Date.now() + offsetMs)), 1000);
    return () => clearInterval(tick);
  }, [offsetMs]);

  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      try {
        const t0 = Date.now();
        const r = await fetch("/api/time", { cache: "no-store" });
        const t1 = Date.now();
        if (!r.ok) return;
        const j = await r.json();
        if (cancelled) return;
        const rtt = (t1 - t0) / 2;
        const drift = Number(j.server_time_ms) + rtt - Date.now();
        if (Number.isFinite(drift)) setOffsetMs(drift);
      } catch { /* offline — keep local clock */ }
    };
    sync();
    const iv = setInterval(sync, 60_000);
    const onOnline = () => { setOnline(true); sync(); };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      cancelled = true;
      clearInterval(iv);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const text = formatClock(now, { locale, timeZone: tz, compact });

  return (
    <span
      id="liveDateTime"
      className="inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground tabular-nums"
      title={`${tz} · ${locale}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${online ? "bg-emerald-400 animate-pulse" : "bg-red-500"}`}
      />
      <span>{text}</span>
    </span>
  );
};

export default LiveDateTime;

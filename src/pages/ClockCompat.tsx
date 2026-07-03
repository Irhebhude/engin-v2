import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Clock } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { formatClock, zoneAbbreviation, detectLocale, detectTimeZone } from "@/lib/datetime-format";

const MATRIX: { locale: string; tz: string; note: string }[] = [
  { locale: "en-NG", tz: "Africa/Lagos", note: "Nigeria → WAT (UTC+1)" },
  { locale: "en-GB", tz: "Europe/London", note: "UK → GMT/BST" },
  { locale: "en-US", tz: "America/New_York", note: "US East" },
  { locale: "en-US", tz: "America/Los_Angeles", note: "US West" },
  { locale: "fr-FR", tz: "Europe/Paris", note: "France" },
  { locale: "de-DE", tz: "Europe/Berlin", note: "Germany" },
  { locale: "ja-JP", tz: "Asia/Tokyo", note: "Japan" },
  { locale: "zh-CN", tz: "Asia/Shanghai", note: "China" },
  { locale: "ar-EG", tz: "Africa/Cairo", note: "Arabic (Egypt)" },
  { locale: "hi-IN", tz: "Asia/Kolkata", note: "India" },
  { locale: "pt-BR", tz: "America/Sao_Paulo", note: "Brazil" },
  { locale: "en", tz: "UTC", note: "UTC baseline" },
];

export default function ClockCompat() {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  const detected = { locale: detectLocale(), tz: detectTimeZone() };

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-foreground">
      <SEOHead
        title="Clock Compatibility — SEARCH-POI Engine v2"
        description="Preview the live clock formatting across locales and timezones to verify browser compatibility."
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-[#00D4FF] mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <header className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-7 h-7 text-[#00D4FF]" />
            <h1 className="text-2xl sm:text-3xl font-bold">Clock Compatibility Check</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Detected: <span className="text-[#00D4FF]">{detected.locale}</span> ·{" "}
            <span className="text-[#00D4FF]">{detected.tz}</span> ·{" "}
            <span className="text-[#00D4FF]">{zoneAbbreviation(detected.tz, now)}</span>
          </p>
        </header>

        <div className="overflow-x-auto rounded-2xl border border-[rgba(0,212,255,0.15)] bg-white/[0.02]">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground bg-white/[0.03]">
              <tr>
                <th className="px-4 py-3 text-left">Locale</th>
                <th className="px-4 py-3 text-left">Timezone</th>
                <th className="px-4 py-3 text-left">Abbr.</th>
                <th className="px-4 py-3 text-left">Compact</th>
                <th className="px-4 py-3 text-left">Full</th>
                <th className="px-4 py-3 text-left">Note</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {MATRIX.map((r) => (
                <tr key={r.locale + r.tz} className="border-t border-white/5">
                  <td className="px-4 py-2.5">{r.locale}</td>
                  <td className="px-4 py-2.5">{r.tz}</td>
                  <td className="px-4 py-2.5 text-[#00D4FF]">{zoneAbbreviation(r.tz, now)}</td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {formatClock(now, { locale: r.locale, timeZone: r.tz, compact: true })}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {formatClock(now, { locale: r.locale, timeZone: r.tz })}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          If any row renders a raw ISO timestamp (e.g. <code>2026-…T…Z</code>), this browser rejected the
          requested Intl option and the fallback formatter took over. Details are logged to the console
          once per unique option combination.
        </p>
      </div>
    </div>
  );
}

// Robust, locale-safe formatter for the live clock.
// Never throws — always returns a string. Logs unsupported options once.

export type ClockOptions = {
  locale?: string;
  timeZone?: string;
  compact?: boolean;
  showZoneAbbr?: boolean;
};

// Canonical mapping for the few zones we advertise as "supported" abbreviations.
// Anything else falls back to computed GMT±N offset.
const ZONE_ABBR: Record<string, string> = {
  "Africa/Lagos": "WAT",
  "Africa/Accra": "GMT",
  "Africa/Abidjan": "GMT",
  "Europe/London": "GMT",
  "UTC": "UTC",
  "Etc/UTC": "UTC",
};

const loggedOnce = new Set<string>();
function logOnce(key: string, err: unknown, ctx: Record<string, unknown>) {
  if (loggedOnce.has(key)) return;
  loggedOnce.add(key);
  // eslint-disable-next-line no-console
  console.warn("[LiveDateTime] Intl.DateTimeFormat rejected option", { key, err, ctx });
}

/** Best-effort timezone detection. Falls back to UTC. */
export function detectTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && typeof tz === "string") return tz;
  } catch {
    /* ignore */
  }
  return "UTC";
}

/** Best-effort locale detection. Falls back to en-US. */
export function detectLocale(): string {
  try {
    if (typeof navigator !== "undefined" && navigator.language) return navigator.language;
  } catch {
    /* ignore */
  }
  return "en-US";
}

/** Return a stable abbreviation for a timezone (WAT for Nigeria, GMT/UTC for UK/UTC, else GMT±N). */
export function zoneAbbreviation(timeZone: string, at: Date = new Date()): string {
  if (ZONE_ABBR[timeZone]) return ZONE_ABBR[timeZone];
  // Compute UTC offset for the zone at `at`.
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    const parts = dtf.formatToParts(at);
    const get = (t: string) => Number(parts.find(p => p.type === t)?.value);
    const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
    const offsetMin = Math.round((asUTC - at.getTime()) / 60000);
    if (offsetMin === 0) return "GMT";
    const sign = offsetMin > 0 ? "+" : "-";
    const abs = Math.abs(offsetMin);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return m === 0 ? `GMT${sign}${h}` : `GMT${sign}${h}:${String(m).padStart(2, "0")}`;
  } catch (err) {
    logOnce("zoneAbbr:" + timeZone, err, { timeZone });
    return "UTC";
  }
}

/**
 * Build a DateTimeFormat, stripping options that throw "Invalid option".
 * Guarantees an instance is returned (falls back to a bare formatter).
 */
function safeFormatter(locale: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  // Remove undefined keys — some engines reject undefined in options.
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(opts)) {
    if (v !== undefined && v !== null) clean[k] = v;
  }
  try {
    return new Intl.DateTimeFormat(locale, clean as Intl.DateTimeFormatOptions);
  } catch (err) {
    logOnce(`fmt:${locale}:${Object.keys(clean).join(",")}`, err, { locale, opts: clean });
    // Progressive fallback: drop the last key and retry until it works, or use bare.
    const keys = Object.keys(clean);
    for (let i = keys.length - 1; i >= 0; i--) {
      const reduced = { ...clean };
      delete reduced[keys[i]];
      try {
        return new Intl.DateTimeFormat(locale, reduced as Intl.DateTimeFormatOptions);
      } catch (e2) {
        logOnce(`fmt-reduce:${locale}:${keys[i]}`, e2, { dropped: keys[i], remaining: reduced });
      }
    }
    try { return new Intl.DateTimeFormat(locale); } catch { /* ignore */ }
    try { return new Intl.DateTimeFormat("en-US"); } catch { /* ignore */ }
    // Last resort: a formatter-shaped object using toISOString.
    return {
      format: (d: Date) => (d instanceof Date ? d.toISOString() : new Date().toISOString()),
    } as unknown as Intl.DateTimeFormat;
  }
}

/**
 * Format a date for the live clock. Never throws.
 */
export function formatClock(at: Date, o: ClockOptions = {}): string {
  const locale = o.locale || detectLocale();
  const timeZone = o.timeZone || detectTimeZone();
  const opts: Intl.DateTimeFormatOptions = o.compact
    ? { timeStyle: "short", timeZone }
    : { dateStyle: "medium", timeStyle: "medium", timeZone };

  const fmt = safeFormatter(locale, opts);
  let text: string;
  try {
    text = fmt.format(at);
  } catch (err) {
    logOnce(`format:${locale}:${timeZone}`, err, { locale, timeZone });
    text = at.toISOString();
  }
  if (o.showZoneAbbr === false) return text;
  return `${text} ${zoneAbbreviation(timeZone, at)}`;
}

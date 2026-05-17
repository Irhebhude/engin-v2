import { Link } from "react-router-dom";
import { Shield, CheckCircle2, XCircle, Crown, FileText, Scale, Download } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  OWNERSHIP_CHECKLIST_HEADER,
  OWNERSHIP_CHECKLIST_LINES,
  buildOwnershipChecklist,
} from "@/lib/truth-engine";

const ADMIN_EMAIL = "prosperozoya50@gmail.com";

const buildOwnershipStatementHTML = () => {
  const today = new Date().toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const checklistHtml = [OWNERSHIP_CHECKLIST_HEADER, ...OWNERSHIP_CHECKLIST_LINES]
    .map((l) => `<li>${l}</li>`)
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>SEARCH-POI Engine v2 — Official Ownership Statement</title>
<style>
  @page { size: A4; margin: 24mm; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #111; line-height: 1.55; }
  h1 { font-size: 24px; margin: 0 0 4px; }
  h2 { font-size: 16px; margin: 22px 0 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  .meta { color: #555; font-size: 12px; margin-bottom: 18px; }
  ul { padding-left: 20px; }
  .seal { margin-top: 32px; padding: 14px; border: 2px solid #111; text-align: center; font-weight: bold; }
  .small { font-size: 11px; color: #555; margin-top: 8px; }
  .sig { margin-top: 40px; }
  .sig-line { border-top: 1px solid #111; width: 280px; margin-top: 40px; padding-top: 4px; font-size: 12px; }
  @media print { .noprint { display: none; } }
</style></head><body>
<h1>SEARCH-POI Engine v2 — Official Ownership Statement</h1>
<div class="meta">Issued ${today} · Reference: /rights · For buyers, partners and licensees</div>

<h2>1. Sole Owner</h2>
<p>SEARCH-POI Engine v2 was conceived, designed, founded, and is wholly owned by:</p>
<ul>
  <li><b>Prosper Ozoya Irhebhude</b> — Founder &amp; Architect</li>
  <li><b>POI Foundation</b> — Holding Entity</li>
</ul>
<p>100% of the intellectual property, copyright, trademarks, source code, brand,
architecture (Reasoning Pipeline, Truth Engine, ICS, Commodity Pulse, etc.) and the
right to license, transfer or sell is held exclusively by the above parties.</p>

<h2>2. Rights Granted to the Owner</h2>
<ul>
  <li>Full and unrestricted right to <b>SELL</b> SEARCH-POI Engine v2 to any party</li>
  <li>Full and unrestricted right to <b>LICENSE</b> the engine, brand or any component</li>
  <li>Full and unrestricted right to <b>TRANSFER</b> or <b>ASSIGN</b> ownership</li>
  <li>Full and unrestricted right to <b>MODIFY</b>, <b>FORK</b> or <b>REBRAND</b> the system</li>
  <li>Full and unrestricted right to <b>MONETIZE</b> through any business model</li>
  <li>Full and unrestricted right to <b>GRANT</b> or <b>REVOKE</b> access to any partner</li>
</ul>

<h2>3. Third-Party Providers — Tools Only</h2>
<p>The following providers supply infrastructure and APIs used by SEARCH-POI as
tools. They <b>do NOT own</b> any part of SEARCH-POI Engine v2, its IP, its brand,
or any rights to sell or transfer it. They are vendors — interchangeable at the
owner's discretion.</p>
<ul>
  <li>Google (Gemini API) — AI model provider — no ownership</li>
  <li>OpenAI (GPT API) — AI model provider — no ownership</li>
  <li>Lovable — Development &amp; hosting platform — no ownership</li>
  <li>Supabase — Database &amp; backend infrastructure — no ownership</li>
  <li>Firecrawl — Web scraping API — no ownership</li>
  <li>Cloudflare — CDN &amp; edge network (optional) — no ownership</li>
</ul>

<h2>4. Ownership Verification Checklist</h2>
<ul>${checklistHtml}</ul>

<h2>5. Verification Steps for Buyers &amp; Partners</h2>
<ol>
  <li>Visit the public reference page at <b>/rights</b> on SEARCH-POI.</li>
  <li>Ask the engine: <i>"Do Prosper Ozoya Irhebhude and POI Foundation have the right to sell SEARCH-POI?"</i> — the engine will output the Ownership Verification Checklist verbatim before answering.</li>
  <li>Confirm direct contact via the official Contact page (POI Foundation).</li>
  <li>Request a signed copy of this Ownership Statement from the owner.</li>
  <li>Confirm transfer of repository access, domain ownership and brand assets at signing.</li>
</ol>

<div class="seal">
  THIS DOCUMENT CONFIRMS — Prosper Ozoya Irhebhude &amp; POI Foundation are the sole owners of SEARCH-POI Engine v2<br/>
  with full right to sell, license, transfer or assign.
  <div class="small">Generated from /rights · ${today}</div>
</div>

<div class="sig">
  <div class="sig-line">Signature — Prosper Ozoya Irhebhude (Founder, POI Foundation)</div>
</div>

<div class="noprint" style="margin-top:24px;text-align:center;">
  <button onclick="window.print()" style="padding:10px 20px;font-size:14px;cursor:pointer;">Print / Save as PDF</button>
</div>
<script>setTimeout(function(){ try { window.print(); } catch(e){} }, 400);</script>
</body></html>`;
};

const Rights = () => {
  const { user } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;

  const handleDownloadPdf = () => {
    try {
      const html = buildOwnershipStatementHTML();
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      // Try to open in a new tab so the auto-print script can run.
      const w = window.open(url, "_blank", "noopener,noreferrer");

      if (!w) {
        // Popup blocked — fall back to a direct download of the HTML file.
        const a = document.createElement("a");
        a.href = url;
        a.download = "SEARCH-POI-Ownership-Statement.html";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }

      // Release the blob URL after the new tab/download has had time to grab it.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      console.error("[Rights] Failed to generate ownership statement:", err);
      alert("Could not generate the ownership statement. Please try again.");
    }
  };

  // checklist preview text (kept verbatim with truth-engine.ts)
  void buildOwnershipChecklist; // referenced for parity
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Rights & Ownership — SEARCH-POI Engine v2"
        description="Official ownership statement for SEARCH-POI Engine v2. Wholly owned by Prosper Ozoya Irhebhude and the POI Foundation. Third-party providers are tools, not rights holders."
      />
      <Header />

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-4">
            <Crown className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Official Ownership Statement
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Rights & <span className="text-primary">Ownership</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Legal clarity on who owns SEARCH-POI Engine v2, who has the right to sell or
            transfer it, and the role of third-party infrastructure providers.
          </p>

          {isAdmin && (
            <div className="mt-6 inline-flex flex-col items-center gap-2">
              <Button onClick={handleDownloadPdf} size="lg" className="gap-2">
                <Download className="w-4 h-4" />
                Download Ownership Statement (PDF)
              </Button>
              <span className="text-xs text-muted-foreground">
                Admin-only · For buyers, partners &amp; licensees
              </span>
            </div>
          )}
        </div>

        {/* Sole Owner Card */}
        <section className="rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/5 to-transparent p-8 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Sole Owner & Founder</h2>
              <p className="text-muted-foreground mb-4">
                SEARCH-POI Engine v2 was conceived, designed, founded, and is wholly owned by:
              </p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-foreground">Prosper Ozoya Irhebhude</span>
                  <span className="text-sm text-muted-foreground">— Founder & Architect</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-foreground">POI Foundation</span>
                  <span className="text-sm text-muted-foreground">— Holding Entity</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                100% of intellectual property, copyright, trademarks, source code, brand,
                architecture (Reasoning Pipeline, Truth Engine, ICS, Commodity Pulse, etc.),
                and the right to license, transfer, or sell is held exclusively by the
                above parties.
              </p>
            </div>
          </div>
        </section>

        {/* Rights Granted */}
        <section className="rounded-2xl border border-border bg-card/40 p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Scale className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">Rights Granted to the Owner</h2>
          </div>
          <ul className="space-y-3">
            {[
              "Full and unrestricted right to SELL SEARCH-POI Engine v2 to any party",
              "Full and unrestricted right to LICENSE the engine, brand, or any component",
              "Full and unrestricted right to TRANSFER or ASSIGN ownership",
              "Full and unrestricted right to MODIFY, FORK, or REBRAND the system",
              "Full and unrestricted right to MONETIZE through any business model",
              "Full and unrestricted right to GRANT or REVOKE access to any user or partner",
            ].map((right, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-foreground">{right}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Third-Party Providers */}
        <section className="rounded-2xl border border-border bg-card/40 p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">Third-Party Providers — Tools Only</h2>
          </div>
          <p className="text-muted-foreground mb-6">
            The following providers supply infrastructure and APIs that SEARCH-POI uses as
            tools. They <span className="text-foreground font-semibold">do NOT own</span>{" "}
            any part of SEARCH-POI Engine v2, its IP, its brand, or any rights to sell or
            transfer it. They are vendors — interchangeable at the owner's discretion.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { name: "Google (Gemini API)", role: "AI model provider" },
              { name: "OpenAI (GPT API)", role: "AI model provider" },
              { name: "Lovable", role: "Development & hosting platform" },
              { name: "Supabase", role: "Database & backend infrastructure" },
              { name: "Firecrawl", role: "Web scraping API" },
              { name: "Cloudflare", role: "CDN & edge network (optional)" },
            ].map((p) => (
              <div
                key={p.name}
                className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50"
              >
                <XCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-foreground text-sm">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.role} — no ownership</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Verification Statement */}
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-8 mb-8">
          <h2 className="text-xl font-bold mb-3">Engine Verification</h2>
          <p className="text-sm text-muted-foreground mb-4">
            When asked about ownership, SEARCH-POI Engine v2 runs an internal Ownership
            Verification Checklist before answering. The engine is required to confirm:
          </p>
          <ol className="space-y-2 text-sm">
            {[
              "Sole owner is Prosper Ozoya Irhebhude & POI Foundation",
              "Owner holds full right to sell, license, and transfer",
              "No third-party provider holds IP or rights",
              "Answer is given directly, without hedging or attributing ownership to vendors",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-primary font-bold">{i + 1}.</span>
                <span className="text-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Contact */}
        <section className="text-center py-8">
          <p className="text-sm text-muted-foreground mb-4">
            For licensing, acquisition, or partnership inquiries:
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
          >
            Contact POI Foundation
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Rights;

import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Fingerprint, KeyRound, Trash2, RefreshCw, Plus, Download, ArrowLeft, Shield,
  CheckCircle2, XCircle,
} from "lucide-react";
import {
  getMethod, hasBiometric, hasPasscode, registerBiometric, deleteBiometric,
  setPasscode, verifyPasscode, verifyBiometric, getLog, logToCSV,
  platformAuthenticatorAvailable,
} from "@/lib/device-lock";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";

export default function SecuritySettings() {
  const [method, setMethod] = useState(getMethod());
  const [bio, setBio] = useState(hasBiometric());
  const [pass, setPass] = useState(hasPasscode());
  const [log, setLog] = useState(getLog());
  const [busy, setBusy] = useState(false);

  function refresh() {
    setMethod(getMethod());
    setBio(hasBiometric());
    setPass(hasPasscode());
    setLog(getLog());
  }

  async function handleAddBiometric() {
    if (!(await platformAuthenticatorAvailable())) {
      toast.error("This device has no biometric sensor.");
      return;
    }
    setBusy(true);
    try {
      const ok = await registerBiometric();
      if (ok) {
        toast.success("Fingerprint registered");
        refresh();
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleReconfirm() {
    setBusy(true);
    try {
      const verified = await verifyBiometric();
      if (!verified) { toast.error("Verification failed"); return; }
      const ok = await registerBiometric();
      if (ok) toast.success("Fingerprint reconfirmed");
      refresh();
    } finally { setBusy(false); }
  }

  async function handleResetBiometric() {
    if (!pass) { toast.error("Set a passcode first to reset biometric."); return; }
    const code = window.prompt("Enter your 4-digit passcode to reset biometric:") || "";
    if (!(await verifyPasscode(code))) { toast.error("Incorrect passcode"); return; }
    deleteBiometric();
    try {
      const ok = await registerBiometric();
      if (ok) toast.success("Fingerprint reset");
    } catch {}
    refresh();
  }

  async function handleDeleteBiometric() {
    if (!pass) { toast.error("Set a passcode first."); return; }
    const code = window.prompt("Enter your 4-digit passcode to confirm:") || "";
    if (!(await verifyPasscode(code))) { toast.error("Incorrect passcode"); return; }
    deleteBiometric();
    toast.success("Fingerprint removed");
    refresh();
  }

  async function handleChangePasscode() {
    if (pass) {
      const cur = window.prompt("Enter current passcode:") || "";
      if (!(await verifyPasscode(cur))) { toast.error("Incorrect passcode"); return; }
    }
    const a = window.prompt("Enter new 4-digit passcode:") || "";
    if (!/^\d{4}$/.test(a)) { toast.error("Must be 4 digits"); return; }
    const b = window.prompt("Confirm new passcode:") || "";
    if (a !== b) { toast.error("Passcodes do not match"); return; }
    await setPasscode(a);
    toast.success("Passcode updated");
    refresh();
  }

  function exportCSV() {
    const blob = new Blob([logToCSV()], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spv2-auth-log-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-foreground">
      <SEOHead
        title="Security Settings — SEARCH-POI Engine v2"
        description="Manage biometric, passcode and authentication log."
      />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-[#00D4FF] mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-7 h-7 text-[#00D4FF]" />
            <h1 className="text-2xl sm:text-3xl font-bold">Security Settings</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Active method: <span className="text-[#00D4FF] font-medium">{method ?? "none"}</span>
          </p>
        </header>

        <Section title="Biometric (Fingerprint)" icon={<Fingerprint className="w-5 h-5" />}>
          {bio ? (
            <div className="space-y-2">
              <Action label="Reconfirm fingerprint" icon={<RefreshCw className="w-4 h-4" />} onClick={handleReconfirm} disabled={busy} />
              <Action label="Reset fingerprint" icon={<RefreshCw className="w-4 h-4" />} onClick={handleResetBiometric} disabled={busy} />
              <Action label="Delete fingerprint" icon={<Trash2 className="w-4 h-4" />} onClick={handleDeleteBiometric} disabled={busy} danger />
            </div>
          ) : (
            <Action label="Add fingerprint" icon={<Plus className="w-4 h-4" />} onClick={handleAddBiometric} disabled={busy} />
          )}
        </Section>

        <Section title="4-Digit Passcode" icon={<KeyRound className="w-5 h-5" />}>
          <Action
            label={pass ? "Change passcode" : "Set passcode"}
            icon={<KeyRound className="w-4 h-4" />}
            onClick={handleChangePasscode}
          />
        </Section>

        <Section title="Authentication Log" icon={<Shield className="w-5 h-5" />}>
          <div className="flex justify-end mb-3">
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-2 px-3 h-10 rounded-lg bg-white/[0.03] border border-[rgba(0,212,255,0.15)] text-xs hover:bg-[rgba(0,212,255,0.08)] min-h-[40px]"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
          {log.length === 0 ? (
            <p className="text-xs text-muted-foreground py-6 text-center">No login attempts yet.</p>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {log.map((e, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 text-xs px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5"
                >
                  <span className="flex items-center gap-2">
                    {e.success ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#00FF88]" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-[#FF3B3B]" />
                    )}
                    <span className={e.success ? "" : "text-[#FF3B3B]"}>
                      {e.method} · {e.device}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(e.ts).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-5 rounded-2xl bg-white/[0.03] border border-[rgba(0,212,255,0.1)] backdrop-blur p-5"
    >
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-4">
        <span className="text-[#00D4FF]">{icon}</span> {title}
      </h2>
      {children}
    </motion.section>
  );
}

function Action({
  label, icon, onClick, disabled, danger,
}: { label: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-between gap-3 px-4 h-12 rounded-xl border transition-colors min-h-[48px] disabled:opacity-50 ${
        danger
          ? "border-[#FF3B3B]/30 text-[#FF3B3B] hover:bg-[#FF3B3B]/5"
          : "border-[rgba(0,212,255,0.15)] hover:bg-[rgba(0,212,255,0.08)]"
      }`}
    >
      <span className="text-sm font-medium">{label}</span>
      <span className="opacity-70">{icon}</span>
    </button>
  );
}

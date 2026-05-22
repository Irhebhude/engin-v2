import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, Delete, Shield } from "lucide-react";
import {
  verifyPasscode,
  verifyBiometric,
  getMethod,
  hasBiometric,
  hasPasscode,
  isLockedOut,
} from "@/lib/device-lock";

interface Props {
  onUnlock: () => void;
}

export default function LockScreen({ onUnlock }: Props) {
  const initial = getMethod();
  const [mode, setMode] = useState<"biometric" | "passcode">(
    initial === "biometric" && hasBiometric() ? "biometric" : "passcode"
  );
  const [code, setCode] = useState("");
  const [shake, setShake] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockoutMs, setLockoutMs] = useState(0);

  useEffect(() => {
    const tick = () => {
      const { locked, remainingMs } = isLockedOut();
      setLockoutMs(locked ? remainingMs : 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (mode === "biometric" && hasBiometric() && !lockoutMs) {
      // Auto-prompt biometric
      tryBiometric();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function tryBiometric() {
    setError(null);
    const ok = await verifyBiometric();
    if (ok) onUnlock();
    else {
      setError("Authentication failed");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  }

  async function onDigit(d: string) {
    if (lockoutMs) return;
    if (code.length >= 4) return;
    const next = code + d;
    setCode(next);
    if (next.length === 4) {
      const ok = await verifyPasscode(next);
      if (ok) {
        onUnlock();
      } else {
        setError("Incorrect passcode");
        setShake(true);
        setTimeout(() => {
          setShake(false);
          setCode("");
        }, 500);
      }
    }
  }

  function fmt(ms: number) {
    const s = Math.ceil(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, "0")}`;
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#0A0F1E] flex flex-col items-center justify-between px-6 py-10">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Shield className="w-6 h-6 text-[#00D4FF]" />
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            SEARCH-POI <span className="text-[#00D4FF]">Engine v2</span>
          </h1>
        </div>
        <p className="text-xs text-muted-foreground">
          Verified Intelligence. Zero Hallucination.
        </p>
      </div>

      <motion.div
        animate={shake ? { x: [-10, 10, -8, 8, -4, 4, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="flex-1 flex flex-col items-center justify-center w-full max-w-xs"
      >
        {lockoutMs > 0 ? (
          <div className="text-center">
            <div className="text-5xl font-mono text-[#FF3B3B] mb-3">{fmt(lockoutMs)}</div>
            <p className="text-sm text-muted-foreground">
              Too many attempts. Try again later.
            </p>
          </div>
        ) : mode === "biometric" ? (
          <button
            onClick={tryBiometric}
            className="flex flex-col items-center gap-4 group"
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-32 h-32 rounded-full flex items-center justify-center"
              style={{
                background: "radial-gradient(circle, rgba(0,212,255,0.25) 0%, transparent 70%)",
                boxShadow: "0 0 60px rgba(0,212,255,0.4)",
              }}
            >
              <Fingerprint className="w-20 h-20 text-[#00D4FF]" />
            </motion.div>
            <p className="text-foreground text-sm">Place finger to unlock</p>
          </button>
        ) : (
          <>
            <div className="flex gap-4 mb-10">
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  animate={{ scale: code.length > i ? 1.15 : 1 }}
                  className={`w-4 h-4 rounded-full border-2 ${
                    code.length > i
                      ? "bg-[#00D4FF] border-[#00D4FF] shadow-[0_0_12px_rgba(0,212,255,0.8)]"
                      : "border-muted-foreground/40"
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground mb-6">Enter your passcode</p>
            <NumberPad
              onDigit={onDigit}
              onDelete={() => setCode(code.slice(0, -1))}
            />
          </>
        )}

        <AnimatePresence>
          {error && !lockoutMs && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[#FF3B3B] text-xs mt-4"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="text-center min-h-[24px]">
        {mode === "biometric" && hasPasscode() && (
          <button
            onClick={() => setMode("passcode")}
            className="text-xs text-[#00D4FF] hover:underline"
          >
            Use 4-digit passcode instead
          </button>
        )}
        {mode === "passcode" && hasBiometric() && (
          <button
            onClick={() => setMode("biometric")}
            className="text-xs text-[#00D4FF] hover:underline"
          >
            Use fingerprint instead
          </button>
        )}
      </div>
    </div>
  );
}

export function NumberPad({
  onDigit,
  onDelete,
}: {
  onDigit: (d: string) => void;
  onDelete: () => void;
}) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];
  return (
    <div className="grid grid-cols-3 gap-3 w-full">
      {keys.map((k, i) =>
        k === "" ? (
          <div key={i} />
        ) : k === "del" ? (
          <button
            key={i}
            onClick={onDelete}
            className="h-16 rounded-2xl flex items-center justify-center text-muted-foreground hover:bg-white/5 active:bg-white/10 transition-colors min-h-[48px]"
          >
            <Delete className="w-5 h-5" />
          </button>
        ) : (
          <button
            key={i}
            onClick={() => onDigit(k)}
            className="h-16 rounded-2xl text-xl font-semibold text-foreground bg-white/[0.03] border border-[rgba(0,212,255,0.1)] hover:bg-[rgba(0,212,255,0.08)] active:scale-95 transition-all min-h-[48px]"
          >
            {k}
          </button>
        )
      )}
    </div>
  );
}

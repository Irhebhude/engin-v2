import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Fingerprint, Shield, Check, ArrowRight } from "lucide-react";
import {
  platformAuthenticatorAvailable,
  registerBiometric,
  setPasscode,
} from "@/lib/device-lock";
import { NumberPad } from "./LockScreen";

interface Props {
  onDone: () => void;
}

type Step = "detect" | "biometric" | "passcode-set" | "passcode-confirm" | "success";

export default function SetupLockScreen({ onDone }: Props) {
  const [step, setStep] = useState<Step>("detect");
  const [hasSensor, setHasSensor] = useState(false);
  const [code, setCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [shake, setShake] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    platformAuthenticatorAvailable().then((ok) => {
      setHasSensor(ok);
      setStep(ok ? "biometric" : "passcode-set");
    });
  }, []);

  async function doBiometric() {
    setErr(null);
    try {
      const ok = await registerBiometric();
      if (ok) setStep("success");
    } catch (e: any) {
      setErr(e?.message || "Failed to register fingerprint");
      // Allow fallback to passcode
      setTimeout(() => setStep("passcode-set"), 1500);
    }
  }

  function handleDigit(d: string) {
    if (step === "passcode-set") {
      if (code.length >= 4) return;
      const next = code + d;
      setCode(next);
      if (next.length === 4) setTimeout(() => setStep("passcode-confirm"), 200);
    } else if (step === "passcode-confirm") {
      if (confirmCode.length >= 4) return;
      const next = confirmCode + d;
      setConfirmCode(next);
      if (next.length === 4) {
        if (next === code) {
          setPasscode(code).then(() => setStep("success"));
        } else {
          setErr("Passcodes do not match. Try again.");
          setShake(true);
          setTimeout(() => {
            setShake(false);
            setCode("");
            setConfirmCode("");
            setErr(null);
            setStep("passcode-set");
          }, 900);
        }
      }
    }
  }

  function handleDelete() {
    if (step === "passcode-set") setCode(code.slice(0, -1));
    else if (step === "passcode-confirm") setConfirmCode(confirmCode.slice(0, -1));
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#0A0F1E] flex flex-col items-center justify-between px-6 py-10">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Shield className="w-6 h-6 text-[#00D4FF]" />
          <h1 className="text-xl font-bold text-foreground">
            SEARCH-POI <span className="text-[#00D4FF]">Engine v2</span>
          </h1>
        </div>
        <p className="text-xs text-muted-foreground">Secure your account</p>
      </div>

      <motion.div
        animate={shake ? { x: [-10, 10, -8, 8, -4, 4, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="flex-1 flex flex-col items-center justify-center w-full max-w-xs"
      >
        {step === "detect" && (
          <p className="text-muted-foreground text-sm">Detecting device capabilities…</p>
        )}

        {step === "biometric" && (
          <div className="flex flex-col items-center text-center">
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-32 h-32 rounded-full flex items-center justify-center mb-6"
              style={{
                background: "radial-gradient(circle, rgba(0,212,255,0.25) 0%, transparent 70%)",
                boxShadow: "0 0 60px rgba(0,212,255,0.4)",
              }}
            >
              <Fingerprint className="w-20 h-20 text-[#00D4FF]" />
            </motion.div>
            <p className="text-foreground text-base font-medium mb-2">
              Register your fingerprint
            </p>
            <p className="text-xs text-muted-foreground mb-6 max-w-[260px]">
              Place your finger on the sensor to secure SEARCH-POI Engine v2.
            </p>
            <button
              onClick={doBiometric}
              className="w-full h-12 rounded-xl bg-[#00D4FF] text-[#0A0F1E] font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition min-h-[48px]"
            >
              Begin <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setStep("passcode-set")}
              className="mt-3 text-xs text-[#00D4FF] hover:underline"
            >
              Use 4-digit passcode instead
            </button>
            {err && <p className="text-[#FF3B3B] text-xs mt-3">{err}</p>}
          </div>
        )}

        {(step === "passcode-set" || step === "passcode-confirm") && (
          <>
            <p className="text-foreground text-base font-medium mb-2">
              {step === "passcode-set"
                ? "Create your 4-digit passcode"
                : "Confirm passcode"}
            </p>
            <div className="flex gap-4 my-6">
              {[0, 1, 2, 3].map((i) => {
                const filled =
                  step === "passcode-set" ? code.length > i : confirmCode.length > i;
                return (
                  <motion.div
                    key={i}
                    animate={{ scale: filled ? 1.15 : 1 }}
                    className={`w-4 h-4 rounded-full border-2 ${
                      filled
                        ? "bg-[#00D4FF] border-[#00D4FF] shadow-[0_0_12px_rgba(0,212,255,0.8)]"
                        : "border-muted-foreground/40"
                    }`}
                  />
                );
              })}
            </div>
            {err && <p className="text-[#FF3B3B] text-xs mb-3">{err}</p>}
            <NumberPad onDigit={handleDigit} onDelete={handleDelete} />
          </>
        )}

        {step === "success" && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center text-center"
          >
            <div className="w-24 h-24 rounded-full bg-[#00FF88]/10 border-2 border-[#00FF88] flex items-center justify-center mb-4">
              <Check className="w-12 h-12 text-[#00FF88]" />
            </div>
            <p className="text-foreground font-semibold mb-1">
              {hasSensor ? "Fingerprint registered successfully" : "Passcode set successfully"}
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              Your account is now secured.
            </p>
            <button
              onClick={onDone}
              className="px-6 h-12 rounded-xl bg-[#00D4FF] text-[#0A0F1E] font-semibold min-h-[48px]"
            >
              Continue
            </button>
          </motion.div>
        )}
      </motion.div>

      <div className="h-6" />
    </div>
  );
}

import { ReactNode, useEffect, useState } from "react";
import LockScreen from "./LockScreen";
import SetupLockScreen from "./SetupLockScreen";
import {
  getMethod,
  isSessionFresh,
  hasPasscode,
  hasBiometric,
  wasSkipped,
  devSkip,
} from "@/lib/device-lock";

interface Props {
  children: ReactNode;
}

// Detect preview iframe to avoid locking the user out during Lovable preview
function inPreviewIframe() {
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const h = window.location.hostname;
  return h.includes("id-preview--") || h.includes("lovableproject.com");
}

export default function DeviceLockGate({ children }: Props) {
  const [needsSetup, setNeedsSetup] = useState(false);
  const [locked, setLocked] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // In Lovable preview iframe, auto-skip so the editor stays usable
    if (inPreviewIframe() && !getMethod()) {
      devSkip();
    }
    const method = getMethod();
    const enrolled = hasPasscode() || hasBiometric();
    if (!enrolled && !wasSkipped()) {
      setNeedsSetup(true);
    } else if (method && !isSessionFresh()) {
      setLocked(true);
    }
    setReady(true);

    const onVisibility = () => {
      // Re-lock when tab regains focus after 24h
      if (document.visibilityState === "visible" && getMethod() && !isSessionFresh()) {
        setLocked(true);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  if (!ready) return null;
  if (needsSetup) return <SetupLockScreen onDone={() => setNeedsSetup(false)} />;
  if (locked) return <LockScreen onUnlock={() => setLocked(false)} />;
  return <>{children}</>;
}

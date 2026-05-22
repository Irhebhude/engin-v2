// Device Lock: passcode + WebAuthn biometric, all client-side.
// Storage in localStorage (encrypted passcode via SubtleCrypto SHA-256).
// No backend dependency — works on Cloudflare static hosting.

export type LockMethod = "passcode" | "biometric" | null;

const K = {
  method: "spv2_lock_method",
  passHash: "spv2_lock_passhash",
  credId: "spv2_lock_credid",
  fails: "spv2_lock_fails",
  lockoutUntil: "spv2_lock_until",
  unlockedAt: "spv2_unlocked_at",
  log: "spv2_auth_log",
  setupSkipped: "spv2_lock_skipped", // dev escape hatch only
};

const SESSION_MS = 24 * 60 * 60 * 1000;
const LOCKOUT_MS = 30 * 60 * 1000;
const MAX_FAILS = 5;

export interface AuthLogEntry {
  ts: number;
  method: "passcode" | "biometric";
  device: string;
  success: boolean;
  location?: string;
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getMethod(): LockMethod {
  return (localStorage.getItem(K.method) as LockMethod) || null;
}

export function hasBiometricSupport(): boolean {
  return typeof window !== "undefined" && !!window.PublicKeyCredential;
}

export async function platformAuthenticatorAvailable(): Promise<boolean> {
  if (!hasBiometricSupport()) return false;
  try {
    return await (window.PublicKeyCredential as any).isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function isLockedOut(): { locked: boolean; remainingMs: number } {
  const until = Number(localStorage.getItem(K.lockoutUntil) || 0);
  const now = Date.now();
  if (until > now) return { locked: true, remainingMs: until - now };
  return { locked: false, remainingMs: 0 };
}

function bumpFails() {
  const n = Number(localStorage.getItem(K.fails) || 0) + 1;
  localStorage.setItem(K.fails, String(n));
  if (n >= MAX_FAILS) {
    localStorage.setItem(K.lockoutUntil, String(Date.now() + LOCKOUT_MS));
    localStorage.setItem(K.fails, "0");
  }
}

function resetFails() {
  localStorage.setItem(K.fails, "0");
  localStorage.removeItem(K.lockoutUntil);
}

export function markUnlocked() {
  localStorage.setItem(K.unlockedAt, String(Date.now()));
  resetFails();
}

export function isSessionFresh(): boolean {
  const t = Number(localStorage.getItem(K.unlockedAt) || 0);
  return t > 0 && Date.now() - t < SESSION_MS;
}

export function lockNow() {
  localStorage.removeItem(K.unlockedAt);
}

// ---------- Passcode ----------
export async function setPasscode(code: string): Promise<void> {
  if (!/^\d{4}$/.test(code)) throw new Error("Passcode must be 4 digits");
  const h = await sha256(code + "|spv2-salt");
  localStorage.setItem(K.passHash, h);
  if (!getMethod()) localStorage.setItem(K.method, "passcode");
}

export async function verifyPasscode(code: string): Promise<boolean> {
  const stored = localStorage.getItem(K.passHash);
  if (!stored) return false;
  const h = await sha256(code + "|spv2-salt");
  const ok = h === stored;
  appendLog({ ts: Date.now(), method: "passcode", device: deviceLabel(), success: ok });
  if (ok) {
    resetFails();
    markUnlocked();
  } else {
    bumpFails();
  }
  return ok;
}

export function hasPasscode(): boolean {
  return !!localStorage.getItem(K.passHash);
}

// ---------- Biometric (WebAuthn) ----------
function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function registerBiometric(): Promise<boolean> {
  if (!hasBiometricSupport()) throw new Error("WebAuthn not supported");
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "SEARCH-POI Engine v2", id: window.location.hostname },
      user: { id: userId, name: "spv2-user", displayName: "SEARCH-POI User" },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;
  if (!cred) return false;
  localStorage.setItem(K.credId, b64url(cred.rawId));
  localStorage.setItem(K.method, "biometric");
  markUnlocked();
  return true;
}

export async function verifyBiometric(): Promise<boolean> {
  const credIdB64 = localStorage.getItem(K.credId);
  if (!credIdB64) return false;
  try {
    const raw = Uint8Array.from(
      atob(credIdB64.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0)
    );
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ type: "public-key", id: raw }],
        userVerification: "required",
        timeout: 60000,
      },
    });
    const ok = !!assertion;
    appendLog({ ts: Date.now(), method: "biometric", device: deviceLabel(), success: ok });
    if (ok) markUnlocked();
    else bumpFails();
    return ok;
  } catch {
    appendLog({ ts: Date.now(), method: "biometric", device: deviceLabel(), success: false });
    bumpFails();
    return false;
  }
}

export function hasBiometric(): boolean {
  return !!localStorage.getItem(K.credId);
}

export function deleteBiometric() {
  localStorage.removeItem(K.credId);
  if (hasPasscode()) localStorage.setItem(K.method, "passcode");
  else localStorage.removeItem(K.method);
}

// ---------- Log ----------
export function appendLog(e: AuthLogEntry) {
  const arr: AuthLogEntry[] = JSON.parse(localStorage.getItem(K.log) || "[]");
  arr.unshift(e);
  localStorage.setItem(K.log, JSON.stringify(arr.slice(0, 200)));
}

export function getLog(): AuthLogEntry[] {
  return JSON.parse(localStorage.getItem(K.log) || "[]");
}

export function logToCSV(): string {
  const rows = getLog();
  const head = "timestamp,method,device,success\n";
  return head + rows.map((r) =>
    [new Date(r.ts).toISOString(), r.method, `"${r.device}"`, r.success].join(",")
  ).join("\n");
}

export function deviceLabel(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad/.test(ua)) return "iOS device";
  if (/Android/.test(ua)) return "Android device";
  if (/Mac/.test(ua)) return "macOS";
  if (/Windows/.test(ua)) return "Windows";
  if (/Linux/.test(ua)) return "Linux";
  return "Unknown device";
}

// Dev-only escape so preview iframe doesn't lock you out forever
export function devSkip() {
  localStorage.setItem(K.setupSkipped, "1");
  markUnlocked();
}
export function wasSkipped(): boolean {
  return localStorage.getItem(K.setupSkipped) === "1";
}
export function resetAll() {
  Object.values(K).forEach((k) => localStorage.removeItem(k));
}

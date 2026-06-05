// Cloudflare Auth primitives — JWT (HS256), PBKDF2 password hashing,
// httpOnly cookie helpers. Replaces Supabase Auth.
//
// All crypto uses WebCrypto (available in Workers runtime). No dependencies.

const enc = new TextEncoder();
const dec = new TextDecoder();

// ─── Base64URL ─────────────────────────────────────────────────────────────
function b64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function b64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ─── PBKDF2 password hashing ───────────────────────────────────────────────
const PBKDF2_ITERS = 100_000;
const PBKDF2_LEN = 32;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERS },
    key, PBKDF2_LEN * 8
  );
  return `pbkdf2$${PBKDF2_ITERS}$${b64urlEncode(salt)}$${b64urlEncode(bits)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, itersStr, saltB64, hashB64] = stored.split("$");
  if (scheme !== "pbkdf2") return false;
  const iters = parseInt(itersStr, 10);
  const salt = b64urlDecode(saltB64);
  const expected = b64urlDecode(hashB64);
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: iters },
    key, expected.length * 8
  ));
  if (bits.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < bits.length; i++) diff |= bits[i] ^ expected[i];
  return diff === 0;
}

// ─── JWT (HS256) ───────────────────────────────────────────────────────────
export interface JwtPayload {
  sub: string;        // user id
  email?: string;
  iat: number;
  exp: number;
  [k: string]: unknown;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign", "verify"]
  );
}

export async function signJwt(payload: Omit<JwtPayload, "iat" | "exp"> & { exp?: number }, secret: string, ttlSec = 3600): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const full: JwtPayload = { iat: now, exp: payload.exp ?? now + ttlSec, ...payload };
  const header = b64urlEncode(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = b64urlEncode(enc.encode(JSON.stringify(full)));
  const data = `${header}.${body}`;
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(data));
  return `${data}.${b64urlEncode(sig)}`;
}

export async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  const [h, b, s] = token.split(".");
  if (!h || !b || !s) return null;
  const ok = await crypto.subtle.verify(
    "HMAC", await hmacKey(secret),
    b64urlDecode(s), enc.encode(`${h}.${b}`)
  );
  if (!ok) return null;
  const payload = JSON.parse(dec.decode(b64urlDecode(b))) as JwtPayload;
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

// ─── Cookies ───────────────────────────────────────────────────────────────
export const ACCESS_COOKIE = "sp_access";
export const REFRESH_COOKIE = "sp_refresh";

export function buildSetCookie(name: string, value: string, maxAgeSec: number): string {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSec}`;
}
export function buildClearCookie(name: string): string {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
export function parseCookies(req: Request): Record<string, string> {
  const h = req.headers.get("cookie") || "";
  const out: Record<string, string> = {};
  for (const part of h.split(/;\s*/)) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i)] = decodeURIComponent(part.slice(i + 1));
  }
  return out;
}

// ─── Session helpers ───────────────────────────────────────────────────────
export interface AuthEnv {
  DB: D1Database;
  JWT_SECRET: string;
  GOOGLE_OAUTH_CLIENT_ID?: string;
  GOOGLE_OAUTH_CLIENT_SECRET?: string;
}

export const ACCESS_TTL = 60 * 60;             // 1h
export const REFRESH_TTL = 60 * 60 * 24 * 30;  // 30d

export async function newRefreshToken(env: AuthEnv, userId: string): Promise<string> {
  const tok = b64urlEncode(crypto.getRandomValues(new Uint8Array(32)));
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO sessions (id, user_id, refresh_token, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(crypto.randomUUID(), userId, tok, now, now + REFRESH_TTL * 1000).run();
  return tok;
}

export async function rotateRefreshToken(env: AuthEnv, oldTok: string): Promise<{ userId: string; newTok: string } | null> {
  const row = await env.DB.prepare(
    `SELECT user_id, expires_at FROM sessions WHERE refresh_token = ?`
  ).bind(oldTok).first<{ user_id: string; expires_at: number }>();
  if (!row || row.expires_at < Date.now()) return null;
  await env.DB.prepare(`DELETE FROM sessions WHERE refresh_token = ?`).bind(oldTok).run();
  const newTok = await newRefreshToken(env, row.user_id);
  return { userId: row.user_id, newTok };
}

export async function requireUser(req: Request, env: AuthEnv): Promise<JwtPayload | null> {
  const cookies = parseCookies(req);
  const tok = cookies[ACCESS_COOKIE] || (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!tok) return null;
  return verifyJwt(tok, env.JWT_SECRET);
}

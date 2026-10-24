// @ts-nocheck
// exam-ping: pushes a short study reminder twice a day (17:00 and 21:00 Berlin, set by pg_cron) while an exam is
// within the next 7 days. Same cron-secret protection and Firebase topic as daily-briefing.
import { buildPingText, examsToPing } from "./logic.ts";

const SUPABASE_URL = "https://ggewdpazpeoielbqrcgm.supabase.co";
// The placeholder below is deliberate: this repository is PUBLIC, so the real hash is never committed.
// When deploying, use the same hash as the live daily-briefing function.
const CRON_SECRET_SHA256 = "REPLACE_WITH_SHA256_OF_CRON_SECRET";
const JSON_HEADERS = { "Content-Type": "application/json" };

async function authorized(req: Request): Promise<boolean> {
  const given = req.headers.get("x-cron-secret") ?? "";
  if (!given) return false;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(given));
  const hex = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  let diff = hex.length ^ CRON_SECRET_SHA256.length;
  for (let i = 0; i < hex.length && i < CRON_SECRET_SHA256.length; i++) diff |= hex.charCodeAt(i) ^ CRON_SECRET_SHA256.charCodeAt(i);
  return diff === 0;
}

const fetchT = (input: string, init: RequestInit = {}) => fetch(input, { ...init, signal: init.signal ?? AbortSignal.timeout(20000) });

function berlinToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/* FIREBASE FCM (same as daily-briefing) */
function base64UrlEncode(input: Uint8Array | string): string {
  let binary = "";
  if (typeof input === "string") input = new TextEncoder().encode(input);
  for (const byte of input) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const normalized = pem.replace(/\\n/g, "\n").replace(/\r/g, "").trim();
  const base64 = normalized.replace("-----BEGIN PRIVATE KEY-----", "").replace("-----END PRIVATE KEY-----", "").replace(/\s/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
async function getFirebaseAccessToken(): Promise<string> {
  const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL");
  const privateKey = Deno.env.get("FIREBASE_PRIVATE_KEY");
  if (!clientEmail || !privateKey) throw new Error("Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY");
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64UrlEncode(JSON.stringify({ iss: clientEmail, scope: "https://www.googleapis.com/auth/firebase.messaging", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const unsigned = `${header}.${payload}`;
  const key = await crypto.subtle.importKey("pkcs8", pemToArrayBuffer(privateKey), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const response = await fetchT("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${base64UrlEncode(new Uint8Array(signature))}` }).toString(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw new Error("Firebase OAuth failed: HTTP " + response.status);
  return data.access_token;
}
async function sendFCM(title: string, body: string): Promise<void> {
  const projectId = Deno.env.get("FIREBASE_PROJECT_ID");
  if (!projectId) throw new Error("Missing FIREBASE_PROJECT_ID");
  const accessToken = await getFirebaseAccessToken();
  const response = await fetchT(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message: { topic: "Kxko-Daily-Briefing", notification: { title, body } } }),
  });
  if (!response.ok) throw new Error(`FCM returned HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
}

Deno.serve(async (req) => {
  if (!(await authorized(req))) return new Response(JSON.stringify({ success: false, error: "Not allowed." }), { status: 403, headers: JSON_HEADERS });
  try {
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY secret.");
    const slot = new URL(req.url).searchParams.get("slot") === "evening" ? "evening" : "afternoon";
    const today = berlinToday();
    const headers = { apikey: key, Authorization: `Bearer ${key}` };

    const examRes = await fetchT(`${SUPABASE_URL}/rest/v1/exams?select=id,subject,exam_date,topics&exam_date=gte.${today}&order=exam_date.asc&limit=20`, { headers });
    if (!examRes.ok) throw new Error(`Could not load exams: HTTP ${examRes.status}`);
    const exams = await examRes.json();
    const due = examsToPing(Array.isArray(exams) ? exams : [], today);
    if (due.length === 0) return new Response(JSON.stringify({ success: true, pushed: false, reason: "no exam within 7 days" }), { status: 200, headers: JSON_HEADERS });

    const qRes = await fetchT(`${SUPABASE_URL}/rest/v1/exam_questions?select=exam_id&exam_id=in.(${due.map((e: any) => e.id).join(",")})`, { headers });
    const qRows = qRes.ok ? await qRes.json() : [];
    const counts = new Map<string, number>();
    for (const row of Array.isArray(qRows) ? qRows : []) counts.set(row.exam_id, (counts.get(row.exam_id) ?? 0) + 1);
    for (const e of due) e.questionCount = counts.get(e.id) ?? 0;

    const text = buildPingText(due, slot);
    const [title, ...rest] = text.split("\n");
    await sendFCM(title, rest.join("\n"));
    return new Response(JSON.stringify({ success: true, pushed: true, slot, exams: due.length, text }), { status: 200, headers: JSON_HEADERS });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("EXAM PING ERROR:", message);
    return new Response(JSON.stringify({ success: false, error: message }), { status: 500, headers: JSON_HEADERS });
  }
});

// Runs the real supabase/functions/daily-briefing/index.ts under Node with a fake Deno global and a mocked network.
// Run with:  node --test "tests/*.test.mjs"
import test from "node:test";
import assert from "node:assert/strict";

/* ---------------------------------------------------------------- harness */

import { createHash } from "node:crypto";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";

// index.ts keeps a placeholder instead of the real cron-secret hash (the repo is public). The test injects the
// hash of its own test secret into a temporary copy, imports that, and deletes it again.
const FN_DIR = new URL("../supabase/functions/daily-briefing/", import.meta.url);
const PLACEHOLDER = "REPLACE_WITH_LIVE_CRON_SECRET_SHA256";
const source = readFileSync(new URL("index.ts", FN_DIR), "utf8");
assert.ok(source.includes(PLACEHOLDER), "index.ts must contain the placeholder, never the real hash");
assert.doesNotMatch(source, /CRON_SECRET_SHA256 = "[0-9a-f]{64}"/, "a real hash must not be committed");
const TEST_COPY = new URL("index.under-test.ts", FN_DIR);
writeFileSync(TEST_COPY, source.replace(PLACEHOLDER, createHash("sha256").update("test-cron-secret").digest("hex")));

// A throw-away RSA key, only so the Firebase JWT signing step has something valid to sign with.
const keyPair = await crypto.subtle.generateKey(
  { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign"]);
const pkcs8 = Buffer.from(await crypto.subtle.exportKey("pkcs8", keyPair.privateKey)).toString("base64");
const TEST_PEM = `-----BEGIN PRIVATE KEY-----\n${pkcs8}\n-----END PRIVATE KEY-----`;

const ENV = {
  GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret", GOOGLE_REFRESH_TOKEN: "refresh",
  ISERV_EXAM_CALENDAR_URL: "https://iserv.test/cal.ics",
  FIREBASE_CLIENT_EMAIL: "svc@test.iam", FIREBASE_PRIVATE_KEY: TEST_PEM, FIREBASE_PROJECT_ID: "proj",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
};

let handler;
globalThis.Deno = { serve: (h) => { handler = h; }, env: { get: (k) => ENV[k] } };

// Retries back off for real in production; make them instant here.
const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn, _ms, ...args) => realSetTimeout(fn, 0, ...args);

try { await import(TEST_COPY.href); } finally { unlinkSync(TEST_COPY); }

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const ICS = "BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART:20261019T080000Z\r\nSUMMARY:Math exam\r\nEND:VEVENT\r\nEND:VCALENDAR";
const GOOD_AI = { success: true, model: "test-model", diagnosis: { diagnosis: "Looks transient.", evidence: [], possibleCauses: [], severity: "medium", canAutoFix: false, recommendedAction: "Check later.", confidence: 60 } };

/** Runs one briefing with scripted behaviour for each service and records every request. */
async function run(opts = {}) {
  const calls = [];
  const count = (re) => calls.filter((c) => re.test(c.url)).length;
  let weatherHits = 0, fcmHits = 0;
  const homework = opts.homework ?? [{ subject: "Math", text: "page 12" }];

  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    const body = typeof init.body === "string" ? init.body : "";
    calls.push({ url, body, method: init.method ?? "GET" });

    if (url.includes("/functions/v1/untis-test")) return json({ success: true, date: 20261019, lessonsChecked: 6, timetable: [], homework });
    if (url.includes("api.open-meteo.com")) {
      weatherHits++;
      if (opts.weather) { const r = opts.weather(weatherHits); if (r) return r; }
      return json({ daily: { weather_code: [2], temperature_2m_min: [3], temperature_2m_max: [11], precipitation_probability_max: [20], wind_speed_10m_max: [14] }, hourly: { time: [], precipitation_probability: [] } });
    }
    if (url.startsWith("https://oauth2.googleapis.com/token")) {
      if (body.includes("grant_type=refresh_token")) {
        if (opts.google) return opts.google();
        return json({ access_token: "g-access" });
      }
      return json({ access_token: "fb-access" }); // Firebase JWT exchange
    }
    if (url.includes("googleapis.com/calendar")) return json({ items: [] });
    if (url.startsWith("https://iserv.test")) return new Response(ICS, { status: 200 });
    if (url.includes("/rest/v1/requests")) return json([]);
    if (url.includes("fcm.googleapis.com")) {
      fcmHits++;
      if (opts.fcm) { const r = opts.fcm(fcmHits, body); if (r === "network") throw new Error("fetch failed"); if (r) return r; }
      return json({ name: "projects/proj/messages/1" });
    }
    if (url.includes("/functions/v1/ai-debugger")) return opts.ai ? opts.ai() : json(GOOD_AI);
    if (url.includes("/rest/v1/briefing_runs")) return opts.saveRuns ? opts.saveRuns() : json([{ id: 1 }], 201);
    if (url.includes("/rest/v1/briefing_events")) return json([], 201);
    throw new Error("unexpected request: " + url);
  };

  const res = await handler(new Request("https://fn.test/daily-briefing?date=20261019", { headers: { "x-cron-secret": "test-cron-secret" } }));
  const out = await res.json();
  const savedRun = calls.find((c) => /briefing_runs/.test(c.url));
  const savedEvents = calls.find((c) => /briefing_events/.test(c.url));
  return {
    res, out, calls, count, weatherHits: () => weatherHits, fcmHits: () => fcmHits,
    ai: calls.find((c) => /ai-debugger/.test(c.url)),
    savedRun: savedRun ? JSON.parse(savedRun.body) : null,
    savedEvents: savedEvents ? JSON.parse(savedEvents.body) : [],
  };
}

/* -------------------------------------------------------------- scenarios */

test("rejects callers without the cron secret", async () => {
  const res = await handler(new Request("https://fn.test/daily-briefing"));
  assert.equal(res.status, 403);
});

test("healthy run: one push, no AI call, run recorded as healthy", async () => {
  const r = await run();
  assert.equal(r.res.status, 200);
  assert.equal(r.out.status, "healthy");
  assert.equal(r.out.selfCheck.status, "healthy");
  assert.equal(r.fcmHits(), 1);
  assert.equal(r.ai, undefined);
  assert.equal(r.savedRun.status, "healthy");
  assert.equal(r.savedRun.push_sent, true);
  assert.match(r.savedRun.briefing, /MONDAY,? 19 OCTOBER/);
  assert.equal(r.savedEvents.length, 0);
});

test("transient weather failure is retried, fixed, logged and needs no AI", async () => {
  const r = await run({ weather: (n) => (n === 1 ? new Response("down", { status: 503 }) : null) });
  assert.equal(r.weatherHits(), 2);
  assert.equal(r.out.selfCheck.status, "repaired");
  assert.equal(r.ai, undefined);
  const ev = r.savedEvents.find((e) => e.component === "weather");
  assert.equal(ev.outcome, "fixed");
  assert.equal(ev.kind, "repair");
  assert.match(ev.found, /503/);
  assert.match(r.out.briefing, /3–11°C/); // the repaired data made it into the briefing
});

test("a dead weather API: placeholders are repaired so the briefing never claims dry weather", async () => {
  const r = await run({ weather: () => new Response("down", { status: 503 }) });
  assert.equal(r.weatherHits(), 3);
  assert.doesNotMatch(r.out.briefing, /none expected|\?/);
  assert.match(r.out.briefing, /Rain: unknown/);
  assert.ok(r.savedEvents.some((e) => e.component === "briefing" && e.outcome === "fixed" && e.details.check === "weather-placeholders"));
  assert.ok(r.savedEvents.some((e) => e.component === "weather" && e.outcome === "reported"));
  assert.equal(r.out.selfCheck.status, "degraded");
  assert.ok(r.ai, "unresolved failure goes to the AI reviewer");
});

test("an expired Google token is NOT retried and is escalated as 'stopped'", async () => {
  const r = await run({ google: () => json({ error: "invalid_grant", error_description: "Token has been expired or revoked." }, 400) });
  const googleHits = r.calls.filter((c) => c.body.includes("grant_type=refresh_token")).length;
  assert.equal(googleHits, 1);
  const ev = r.savedEvents.find((e) => e.component === "google-calendar");
  assert.equal(ev.outcome, "stopped");
  assert.equal(ev.kind, "escalation");
  assert.equal(r.out.selfCheck.status, "degraded");
  assert.equal(r.fcmHits(), 1); // the rest of the briefing still goes out
});

test("the AI reviewer never receives the briefing text or secrets", async () => {
  const r = await run({
    homework: [{ subject: "Secret", text: "PRIVATE-HOMEWORK-TEXT" }],
    google: () => json({ error: "invalid_grant", error_description: "bad token for me@example.com" }, 400),
  });
  assert.ok(r.ai);
  assert.match(r.out.briefing, /PRIVATE-HOMEWORK-TEXT/); // it is in the briefing...
  assert.doesNotMatch(r.ai.body, /PRIVATE-HOMEWORK-TEXT/); // ...but never sent to the AI
  assert.doesNotMatch(r.ai.body, /me@example\.com/);
  assert.equal("briefing" in JSON.parse(r.ai.body).logs, false);
});

test("FCM 503 is retried (explicit server rejection) and succeeds without a duplicate push", async () => {
  const r = await run({ fcm: (n) => (n < 3 ? new Response("UNAVAILABLE", { status: 503 }) : null) });
  assert.equal(r.fcmHits(), 3);
  assert.equal(r.out.selfCheck.status, "repaired");
  assert.equal(r.savedRun.push_sent, true);
  assert.ok(r.savedEvents.some((e) => e.component === "firebase-fcm" && e.outcome === "fixed"));
});

test("an ambiguous FCM network error is NOT retried (it could double-push)", async () => {
  const r = await run({ fcm: () => "network" });
  assert.equal(r.fcmHits(), 1);
  assert.equal(r.savedRun.push_sent, false);
  assert.equal(r.out.selfCheck.status, "degraded");
});

test("an oversized briefing is shortened BEFORE sending, and the full text is kept for the dashboard", async () => {
  const homework = Array.from({ length: 150 }, (_, i) => ({ subject: `S${i}`, text: `read chapter number ${i} very carefully` }));
  const r = await run({ homework });
  const pushed = JSON.parse(r.calls.find((c) => /fcm\.googleapis/.test(c.url)).body).message.notification.body;
  assert.ok(new TextEncoder().encode(pushed).length <= 3500);
  assert.match(pushed, /more lines, see dashboard\)$/);
  assert.ok(r.savedEvents.some((e) => e.details?.check === "push-size" && e.outcome === "fixed"));
});

test("FCM rejects the payload and the AI agrees: shortened to 1800 bytes and re-sent", async () => {
  const homework = Array.from({ length: 150 }, (_, i) => ({ subject: `S${i}`, text: `read chapter number ${i} very carefully` }));
  const r = await run({
    homework,
    fcm: (_n, body) => (new TextEncoder().encode(body).length > 2500 ? new Response("Request payload size exceeds the limit", { status: 400 }) : null),
    ai: () => json({ ...GOOD_AI, diagnosis: { ...GOOD_AI.diagnosis, diagnosis: "payload too large", canAutoFix: true, confidence: 85 } }),
  });
  assert.equal(r.fcmHits(), 2);
  assert.equal(r.savedRun.push_sent, true);
  assert.ok(new TextEncoder().encode(r.savedRun.briefing).length <= 1800);
  const fix = r.savedEvents.find((e) => e.component === "firebase-fcm" && e.outcome === "fixed" && e.details.repair === "truncate_text");
  assert.ok(fix, "the AI-approved repair is logged");
  assert.ok(r.savedEvents.some((e) => e.kind === "ai"));
});

test("same FCM rejection but the AI is unsure: nothing is changed, run is stopped for you", async () => {
  const homework = Array.from({ length: 150 }, (_, i) => ({ subject: `S${i}`, text: `read chapter number ${i} very carefully` }));
  const r = await run({
    homework,
    fcm: (_n, body) => (new TextEncoder().encode(body).length > 2500 ? new Response("Request payload size exceeds the limit", { status: 400 }) : null),
    ai: () => json({ ...GOOD_AI, diagnosis: { ...GOOD_AI.diagnosis, canAutoFix: true, confidence: 40 } }),
  });
  assert.equal(r.fcmHits(), 1);
  assert.equal(r.savedRun.push_sent, false);
  const ev = r.savedEvents.find((e) => e.component === "firebase-fcm" && e.outcome === "stopped");
  assert.ok(ev);
  assert.match(ev.action, /below the required 70/);
});

test("an unreachable AI reviewer is handled and recorded, and cannot approve anything", async () => {
  const r = await run({ weather: () => new Response("down", { status: 500 }), ai: () => new Response("bad gateway", { status: 502 }) });
  assert.equal(r.res.status, 200);
  const ai = r.savedEvents.find((e) => e.kind === "ai");
  assert.match(ai.found, /could not be reached|unusable/);
});

test("if recording fails the briefing still goes out and the response says so", async () => {
  const r = await run({ saveRuns: () => new Response("relation does not exist", { status: 404 }) });
  assert.equal(r.res.status, 200);
  assert.equal(r.fcmHits(), 1);
  assert.equal(r.out.selfCheck.saved.saved, false);
  assert.match(r.out.selfCheck.saved.error, /HTTP 404/);
});

test("a malformed date is rejected cleanly (500 with a message, no push)", async () => {
  globalThis.fetch = async () => { throw new Error("no network expected"); };
  const res = await handler(new Request("https://fn.test/daily-briefing?date=tomorrow", { headers: { "x-cron-secret": "test-cron-secret" } }));
  assert.equal(res.status, 500);
  assert.match((await res.json()).error, /YYYYMMDD/);
});

// Run with:  node --test "tests/*.test.mjs"
import test from "node:test";
import assert from "node:assert/strict";

import {
  ALLOWED_REPAIRS,
  aiEvent,
  buildAiPayload,
  byteLength,
  candidateRepair,
  checkComponentData,
  classifyError,
  componentEvents,
  findingToEvent,
  inspectBriefing,
  isSafePushRetry,
  maxSeverity,
  redact,
  runStatus,
  runSummary,
  safetyGate,
  saveRun,
  truncateToBytes,
  validateAiVerdict,
  withRetry,
} from "../supabase/functions/daily-briefing/selfcheck.ts";

const CLEAN = [
  "SUNDAY 18 OCTOBER",
  "",
  "WEATHER\nPartly cloudy\n3–11°C | 20% rain | 14 km/h\nRain: none expected",
  "",
  "CALENDAR\n09:00 Piano lesson",
].join("\n");

const noSleep = async () => {};

/* ------------------------------------------------------------ redact */

test("redact removes JWTs, bearer tokens, emails, keys and long hex", () => {
  const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijklmnop";
  const out = redact(`Bearer ${jwt} mail me@example.com key=sk-or-v1-abcdefghijklmnop0123 ${"a".repeat(40)}`);
  assert.doesNotMatch(out, /eyJ/);
  assert.doesNotMatch(out, /me@example\.com/);
  assert.doesNotMatch(out, /sk-or-v1/);
  assert.doesNotMatch(out, /a{40}/);
});

test("redact removes private key blocks and url secrets", () => {
  const out = redact("-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkq\n-----END PRIVATE KEY----- https://x.test/a?token=abc123secret&b=1");
  assert.match(out, /\[redacted-key\]/);
  assert.doesNotMatch(out, /MIIEvQ/);
  assert.match(out, /token=\[redacted\]/);
  assert.match(out, /b=1/);
});

test("redact redacts key/value secrets and handles non-strings and long input", () => {
  assert.match(redact('client_secret: "hunter2hunter2"'), /client_secret.*\[redacted\]/);
  assert.equal(redact(null), "");
  assert.equal(redact(undefined), "");
  const long = redact("word ".repeat(300), 100);
  assert.ok(long.length <= 101);
  assert.ok(long.endsWith("…"));
});

/* ----------------------------------------------------- classifyError */

test("classifyError sorts errors into the right categories", () => {
  assert.equal(classifyError("Weather API returned HTTP 503: x").category, "transient");
  assert.equal(classifyError("The signal timed out").category, "transient");
  assert.equal(classifyError("fetch failed").category, "transient");
  assert.equal(classifyError("Google token refresh failed: HTTP 400 invalid_grant").category, "auth");
  assert.equal(classifyError("IServ returned HTTP 403").category, "auth");
  assert.equal(classifyError("Missing Google Calendar secrets. Required: X").category, "config");
  assert.equal(classifyError("Missing ISERV_EXAM_CALENDAR_URL secret.").category, "config");
  assert.equal(classifyError("untis-test returned invalid JSON: <html>").category, "parse");
  assert.equal(classifyError("HTTP 404 nothing here").category, "unknown");
  assert.equal(classifyError("HTTP 404 nothing here").retryable, false);
  assert.equal(classifyError("HTTP 503").retryable, true);
  assert.equal(classifyError("invalid_grant").retryable, false);
});

test("classifyError flags credential-related messages", () => {
  assert.equal(classifyError("Firebase OAuth failed: bad private key").mentionsSecrets, true);
  assert.equal(classifyError("Weather API returned HTTP 502").mentionsSecrets, false);
});

/* ---------------------------------------------------------- withRetry */

test("withRetry returns immediately on success", async () => {
  const r = await withRetry(async () => 42, { sleep: noSleep });
  assert.deepEqual([r.ok, r.value, r.attempts, r.recovered], [true, 42, 1, false]);
});

test("withRetry recovers from a transient failure and backs off exponentially", async () => {
  let calls = 0;
  const delays = [];
  const r = await withRetry(
    async () => { calls++; if (calls < 3) throw new Error("HTTP 503 unavailable"); return "ok"; },
    { delayMs: 800, sleep: async (ms) => { delays.push(ms); } },
  );
  assert.equal(r.ok, true);
  assert.equal(r.attempts, 3);
  assert.equal(r.recovered, true);
  assert.match(r.firstError, /503/);
  assert.deepEqual(delays, [800, 1600]);
});

test("withRetry never retries credential or config errors", async () => {
  let calls = 0;
  const r = await withRetry(async () => { calls++; throw new Error("Google token refresh failed: HTTP 400 invalid_grant"); }, { sleep: noSleep });
  assert.equal(calls, 1);
  assert.equal(r.ok, false);
  assert.match(r.stoppedBecause, /not retryable \(auth\)/);

  calls = 0;
  await withRetry(async () => { calls++; throw new Error("Missing Google Calendar secrets"); }, { sleep: noSleep });
  assert.equal(calls, 1);
});

test("withRetry gives up after the attempt limit", async () => {
  let calls = 0;
  const r = await withRetry(async () => { calls++; throw new Error("HTTP 500"); }, { attempts: 3, sleep: noSleep });
  assert.equal(calls, 3);
  assert.equal(r.ok, false);
  assert.equal(r.stoppedBecause, "retries exhausted");
});

test("withRetry honours a custom retry predicate", async () => {
  let calls = 0;
  const r = await withRetry(async () => { calls++; throw new Error("HTTP 503"); }, { sleep: noSleep, isRetryable: () => false });
  assert.equal(calls, 1);
  assert.equal(r.ok, false);
});

test("push retry is only allowed for explicit FCM server rejections", () => {
  assert.equal(isSafePushRetry("FCM returned HTTP 503: UNAVAILABLE"), true);
  assert.equal(isSafePushRetry("FCM returned HTTP 429: quota"), true);
  assert.equal(isSafePushRetry("fetch failed"), false); // might have been delivered: never double-push
  assert.equal(isSafePushRetry("The signal timed out"), false);
  assert.equal(isSafePushRetry("FCM returned HTTP 400: bad"), false);
  assert.equal(isSafePushRetry("FCM returned HTTP 403: nope"), false);
});

/* --------------------------------------------------------- safetyGate */

test("safetyGate allows an allowlisted repair that touches nothing sensitive", () => {
  for (const repair of ALLOWED_REPAIRS) {
    assert.equal(safetyGate({ repair, severity: "medium", category: "transient" }).allowed, true, repair);
  }
});

test("safetyGate refuses unknown repairs, stored-data changes, credentials and critical severity", () => {
  assert.equal(safetyGate({ repair: "delete_rows", severity: "low", category: "content" }).allowed, false);
  assert.equal(safetyGate({ repair: "retry_component", severity: "low", category: "content", touchesStoredData: true }).allowed, false);
  assert.equal(safetyGate({ repair: "retry_component", severity: "low", category: "auth" }).allowed, false);
  assert.equal(safetyGate({ repair: "retry_component", severity: "low", category: "config" }).allowed, false);
  assert.equal(safetyGate({ repair: "sanitize_text", severity: "critical", category: "content" }).allowed, false);
  assert.equal(safetyGate({ repair: "retry_push", severity: "low", category: "unknown", mentionsSecrets: true }).allowed, false);
});

test("safetyGate requires the AI's agreement and enough confidence when asked", () => {
  const base = { repair: "truncate_text", severity: "medium", category: "unknown", requireAi: true };
  assert.equal(safetyGate({ ...base }).allowed, false);
  assert.equal(safetyGate({ ...base, aiCanAutoFix: false, aiConfidence: 95 }).allowed, false);
  assert.equal(safetyGate({ ...base, aiCanAutoFix: true, aiConfidence: 69 }).allowed, false);
  assert.equal(safetyGate({ ...base, aiCanAutoFix: true, aiConfidence: null }).allowed, false);
  assert.equal(safetyGate({ ...base, aiCanAutoFix: true, aiConfidence: 70 }).allowed, true);
});

test("the code, not the AI, proposes repairs", () => {
  assert.equal(candidateRepair("firebase-fcm", "FCM returned HTTP 400: Request payload size exceeds the limit"), "truncate_text");
  assert.equal(candidateRepair("firebase-fcm", "FCM returned HTTP 403: forbidden"), null);
  assert.equal(candidateRepair("google-calendar", "HTTP 400 payload size"), null);
});

/* ---------------------------------------------------- inspectBriefing */

test("a clean briefing produces no findings and is unchanged", () => {
  const r = inspectBriefing(CLEAN);
  assert.deepEqual(r.findings, []);
  assert.equal(r.text, CLEAN);
});

test("an empty briefing is a critical stop, never 'fixed'", () => {
  const r = inspectBriefing("   \n ");
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].severity, "critical");
  assert.equal(r.findings[0].outcome, "stopped");
});

test("weather placeholders are replaced and the false 'no rain' claim is corrected", () => {
  const broken = "SUNDAY 18 OCTOBER\n\nWEATHER\nUnknown\n?–?°C | ?% rain | ? km/h\nRain: none expected";
  const r = inspectBriefing(broken);
  assert.doesNotMatch(r.text, /\?/);
  assert.match(r.text, /Forecast unavailable/);
  assert.match(r.text, /Weather unavailable/);
  assert.match(r.text, /Rain: unknown/);
  assert.doesNotMatch(r.text, /none expected/);
  const f = r.findings.find((x) => x.check === "weather-placeholders");
  assert.equal(f.outcome, "fixed");
  assert.equal(f.repair, "sanitize_text");
});

test("leaked undefined / NaN / [object Object] are replaced and the originals logged", () => {
  const r = inspectBriefing(CLEAN + "\nHOMEWORK\nMath: undefined\nBio: NaN pages\nX: [object Object]");
  assert.doesNotMatch(r.text, /undefined|NaN|\[object Object\]/);
  const f = r.findings.find((x) => x.check === "leaked-values");
  assert.equal(f.outcome, "fixed");
  assert.equal(f.details.examples.length, 3);
});

test("consecutive duplicate lines are removed", () => {
  const r = inspectBriefing(CLEAN + "\n09:00 Piano lesson\n09:00 Piano lesson");
  assert.equal(r.text.split("09:00 Piano lesson").length - 1, 1);
  assert.equal(r.findings.find((x) => x.check === "duplicate-lines").details.removed, 2);
});

test("an oversized briefing is shortened to the byte limit with a pointer to the dashboard", () => {
  const big = CLEAN + "\nHOMEWORK\n" + Array.from({ length: 200 }, (_, i) => `Subject ${i}: read chapter ${i} carefully`).join("\n");
  const r = inspectBriefing(big, { maxBytes: 1000 });
  assert.ok(byteLength(r.text) <= 1000, `got ${byteLength(r.text)}`);
  assert.match(r.text, /more lines, see dashboard\)$/);
  assert.ok(r.text.startsWith("SUNDAY 18 OCTOBER"));
  const f = r.findings.find((x) => x.check === "push-size");
  assert.equal(f.repair, "truncate_text");
  assert.ok(f.details.droppedLines > 0);
  // Idempotent: running it again changes nothing.
  assert.equal(inspectBriefing(r.text, { maxBytes: 1000 }).findings.find((x) => x.check === "push-size"), undefined);
});

test("truncation counts bytes, not characters (umlauts and emoji)", () => {
  const text = Array.from({ length: 60 }, () => "Übung für Mathe ☀️ äöü").join("\n");
  const r = truncateToBytes(text, 400);
  assert.ok(byteLength(r.text) <= 400);
  assert.ok(r.droppedLines > 0);
});

test("a missing date header or WEATHER section is reported, not silently 'fixed'", () => {
  const r = inspectBriefing("hello\n\nCALENDAR\n09:00 x");
  const checks = r.findings.map((f) => f.check);
  assert.ok(checks.includes("date-header"));
  assert.ok(checks.includes("weather-section"));
  assert.ok(r.findings.every((f) => f.outcome === "reported"));
  assert.equal(r.text, "hello\n\nCALENDAR\n09:00 x");
});

/* ---------------------------------------------------- checkComponentData */

test("stale or empty source data is reported", () => {
  const mismatch = checkComponentData({
    dateKey: "20261019",
    components: [{ name: "webuntis", success: true, data: { date: 20261016, lessonsChecked: 5 } }],
  });
  assert.equal(mismatch[0].check, "untis-date");
  assert.equal(mismatch[0].severity, "high");

  const empty = checkComponentData({
    dateKey: "20261019", // a Monday
    components: [{ name: "webuntis", success: true, data: { date: 20261019, lessonsChecked: 0 } }],
  });
  assert.equal(empty[0].check, "untis-empty");
  assert.equal(empty[0].outcome, "reported");
});

test("zero lessons on a Sunday is not a problem", () => {
  const f = checkComponentData({
    dateKey: "20261018",
    components: [{ name: "webuntis", success: true, data: { date: 20261018, lessonsChecked: 0 } }],
  });
  assert.deepEqual(f, []);
});

test("a weather answer without temperatures is reported", () => {
  const f = checkComponentData({
    dateKey: "20261019",
    components: [{ name: "weather", success: true, data: { todayLow: null, todayHigh: null } }],
  });
  assert.equal(f[0].check, "weather-values");
});

/* ------------------------------------------------------ componentEvents */

test("a component that recovered on retry is logged as a fix", () => {
  const [e] = componentEvents([{ name: "weather", success: true, recovered: true, attempts: 2, firstError: "Weather API returned HTTP 503" }]);
  assert.equal(e.kind, "repair");
  assert.equal(e.outcome, "fixed");
  assert.match(e.found, /503/);
  assert.match(e.action, /attempt 2/);
});

test("a credential failure is stopped and escalated, not retried or changed", () => {
  const [e] = componentEvents([{ name: "google-calendar", success: false, attempts: 1, error: "Google token refresh failed: HTTP 400 invalid_grant: Token has been expired or revoked." }]);
  assert.equal(e.kind, "escalation");
  assert.equal(e.outcome, "stopped");
  assert.equal(e.severity, "high");
  assert.match(e.action, /credentials or configuration need a human/);
});

test("a transient failure that outlasted the retries is reported with the attempt count", () => {
  const [e] = componentEvents([{ name: "iserv-exams", success: false, attempts: 3, error: "IServ returned HTTP 503: down" }]);
  assert.equal(e.outcome, "reported");
  assert.match(e.action, /3 time/);
});

test("healthy components create no events", () => {
  assert.deepEqual(componentEvents([{ name: "weather", success: true, attempts: 1 }]), []);
});

test("component events never contain raw secrets", () => {
  const [e] = componentEvents([{ name: "firebase-fcm", success: false, attempts: 1, error: "Firebase OAuth failed: Bearer ya29.a0AfH6SMBabcdefghijklmnop12345 for me@example.com" }]);
  assert.doesNotMatch(JSON.stringify(e), /ya29|me@example/);
});

test("findingToEvent maps outcomes to event kinds", () => {
  const base = { check: "c", severity: "low", found: "f", action: "a" };
  assert.equal(findingToEvent("briefing", { ...base, outcome: "fixed", repair: "sanitize_text" }).kind, "repair");
  assert.equal(findingToEvent("briefing", { ...base, outcome: "stopped" }).kind, "escalation");
  assert.equal(findingToEvent("briefing", { ...base, outcome: "reported" }).kind, "check");
  assert.equal(findingToEvent("briefing", { ...base, outcome: "fixed", repair: "sanitize_text" }).details.repair, "sanitize_text");
});

/* ------------------------------------------------------------ AI review */

test("the AI payload carries redacted metadata only, never the briefing text", () => {
  const payload = buildAiPayload({
    dateKey: "20261019",
    components: [
      { name: "weather", success: true, attempts: 1 },
      { name: "google-calendar", success: false, attempts: 1, error: "invalid_grant for me@example.com token=abc123secretvalue" },
    ],
    findings: [{ kind: "check", component: "google-calendar", severity: "high", outcome: "stopped", found: "Bearer abc.def.ghi leaked", action: "x", details: {} }],
  });
  const json = JSON.stringify(payload);
  assert.equal(payload.function, "daily-briefing");
  assert.equal(payload.problem.length, 1);
  assert.equal(payload.logs.components.length, 2);
  assert.equal("briefing" in payload.logs, false);
  assert.doesNotMatch(json, /me@example\.com|abc123secretvalue|Bearer abc/);
});

test("validateAiVerdict normalises a good answer, with or without the wrapper", () => {
  const body = { success: true, model: "m", diagnosis: { diagnosis: "Token expired", severity: "high", canAutoFix: false, recommendedAction: "Re-authorise", confidence: 88.6 } };
  for (const input of [body, { triggered: true, success: true, result: body }]) {
    const v = validateAiVerdict(input);
    assert.equal(v.ok, true);
    assert.equal(v.severity, "high");
    assert.equal(v.confidence, 89);
    assert.equal(v.model, "m");
    assert.equal(v.canAutoFix, false);
  }
});

test("validateAiVerdict is strict: bad shapes fail closed", () => {
  assert.equal(validateAiVerdict(null).ok, false);
  assert.equal(validateAiVerdict("nope").ok, false);
  assert.equal(validateAiVerdict({ triggered: true, success: false, error: "HTTP 502" }).ok, false);
  assert.equal(validateAiVerdict({ success: true }).ok, false);
  const v = validateAiVerdict({ success: true, diagnosis: { diagnosis: "x", severity: "apocalyptic", canAutoFix: "yes", confidence: 900 } });
  assert.equal(v.severity, "medium");
  assert.equal(v.canAutoFix, false); // only a real boolean true counts
  assert.equal(v.confidence, 100);
  assert.equal(validateAiVerdict({ success: true, diagnosis: { confidence: "high" } }).confidence, 0);
});

test("an unusable AI answer can never approve a repair", () => {
  const v = validateAiVerdict({ success: false, error: "nope" });
  const gate = safetyGate({ repair: "truncate_text", severity: "medium", category: "unknown", requireAi: true, aiCanAutoFix: v.canAutoFix, aiConfidence: v.confidence });
  assert.equal(gate.allowed, false);
});

test("the AI can raise severity but never lower it", () => {
  assert.equal(maxSeverity("high", "low"), "high");
  assert.equal(maxSeverity("low", "critical"), "critical");
  const lowering = aiEvent("ai-review", { ok: true, diagnosis: "fine", severity: "low", canAutoFix: true, confidence: 90, recommendedAction: "none", model: "m" }, "high");
  assert.equal(lowering.severity, "high");
  const raising = aiEvent("ai-review", { ok: true, diagnosis: "bad", severity: "critical", canAutoFix: false, confidence: 90, recommendedAction: "act", model: "m" }, "medium");
  assert.equal(raising.severity, "critical");
  assert.equal(aiEvent("ai-review", validateAiVerdict(null), "medium").outcome, "reported");
});

/* ------------------------------------------------------- run status etc. */

test("runStatus reflects what happened", () => {
  const fixed = { kind: "repair", component: "weather", severity: "low", outcome: "fixed", found: "", action: "", details: {} };
  const stopped = { kind: "escalation", component: "google-calendar", severity: "high", outcome: "stopped", found: "", action: "", details: {} };
  const reportedMedium = { kind: "check", component: "iserv-exams", severity: "medium", outcome: "reported", found: "", action: "", details: {} };
  const aiNote = { kind: "ai", component: "ai-review", severity: "medium", outcome: "reported", found: "", action: "", details: {} };

  assert.equal(runStatus({ hasBriefing: true, pushSent: true, events: [] }), "healthy");
  assert.equal(runStatus({ hasBriefing: true, pushSent: true, events: [fixed] }), "repaired");
  assert.equal(runStatus({ hasBriefing: true, pushSent: true, events: [fixed, stopped] }), "degraded");
  assert.equal(runStatus({ hasBriefing: true, pushSent: true, events: [reportedMedium] }), "degraded");
  assert.equal(runStatus({ hasBriefing: true, pushSent: false, events: [] }), "degraded");
  assert.equal(runStatus({ hasBriefing: true, pushSent: true, events: [aiNote] }), "healthy");
  assert.equal(runStatus({ hasBriefing: false, pushSent: false, events: [] }), "failed");
  assert.match(runSummary("repaired", [fixed, stopped, reportedMedium]), /1 fixed automatically, 1 stopped for you, 1 reported/);
});

/* --------------------------------------------------------------- saveRun */

function fakeFetch(plan) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init });
    const step = plan.shift();
    if (step instanceof Error) throw step;
    return { ok: step.ok, status: step.status ?? (step.ok ? 201 : 500), json: async () => step.body };
  };
  return { impl, calls };
}

const RUN = { date_key: "20261019", status: "repaired", briefing: CLEAN, push_sent: true, summary: "s",
  components: [{ name: "weather", success: true, attempts: 2, recovered: true, error: "Bearer abc.def.ghi" }] };
const EVENT = { kind: "repair", component: "weather", severity: "low", outcome: "fixed", found: "f", action: "a", details: {} };

test("saveRun stores the run, then its events linked by run_id", async () => {
  const { impl, calls } = fakeFetch([{ ok: true, body: [{ id: 7 }] }, { ok: true, body: [] }]);
  const r = await saveRun({ supabaseUrl: "https://x.test", serviceKey: "svc", fetchImpl: impl }, RUN, [EVENT, EVENT]);
  assert.deepEqual(r, { saved: true, runId: 7 });
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /\/rest\/v1\/briefing_runs$/);
  assert.match(calls[1].url, /\/rest\/v1\/briefing_events$/);
  assert.equal(JSON.parse(calls[1].init.body)[0].run_id, 7);
  assert.equal(JSON.parse(calls[1].init.body).length, 2);
  assert.doesNotMatch(calls[0].init.body, /Bearer abc/); // component errors are redacted before storing
});

test("saveRun skips the events call when there are none", async () => {
  const { impl, calls } = fakeFetch([{ ok: true, body: [{ id: 1 }] }]);
  const r = await saveRun({ supabaseUrl: "https://x.test", serviceKey: "svc", fetchImpl: impl }, RUN, []);
  assert.equal(r.saved, true);
  assert.equal(calls.length, 1);
});

test("saveRun never throws: missing key, HTTP errors and network errors are returned", async () => {
  assert.equal((await saveRun({ supabaseUrl: "u", serviceKey: undefined }, RUN, [])).saved, false);

  const http = fakeFetch([{ ok: false, status: 404 }]);
  const r1 = await saveRun({ supabaseUrl: "u", serviceKey: "k", fetchImpl: http.impl }, RUN, [EVENT]);
  assert.equal(r1.saved, false);
  assert.match(r1.error, /HTTP 404/);

  const boom = fakeFetch([new Error("fetch failed")]);
  const r2 = await saveRun({ supabaseUrl: "u", serviceKey: "k", fetchImpl: boom.impl }, RUN, [EVENT]);
  assert.equal(r2.saved, false);

  const noId = fakeFetch([{ ok: true, body: [] }]);
  assert.equal((await saveRun({ supabaseUrl: "u", serviceKey: "k", fetchImpl: noId.impl }, RUN, [EVENT])).saved, false);

  const evFail = fakeFetch([{ ok: true, body: [{ id: 3 }] }, { ok: false, status: 400 }]);
  const r3 = await saveRun({ supabaseUrl: "u", serviceKey: "k", fetchImpl: evFail.impl }, RUN, [EVENT]);
  assert.equal(r3.saved, false);
  assert.equal(r3.runId, 3);
});

/* ------------------------------------------------- end-to-end scenarios */

test("scenario: a flaky weather API is repaired by retry and the run ends 'repaired'", async () => {
  let calls = 0;
  const weather = await withRetry(async () => { calls++; if (calls === 1) throw new Error("Weather API returned HTTP 503: x"); return { todayLow: 3, todayHigh: 11 }; }, { sleep: noSleep });
  const component = { name: "weather", success: weather.ok, data: weather.value, attempts: weather.attempts, recovered: weather.recovered, firstError: weather.firstError };
  const events = componentEvents([component]);
  assert.equal(runStatus({ hasBriefing: true, pushSent: true, events }), "repaired");
  assert.equal(events[0].outcome, "fixed");
});

test("scenario: an expired Google token is stopped and the run is 'degraded', with no repair attempted", async () => {
  let calls = 0;
  const r = await withRetry(async () => { calls++; throw new Error("Google token refresh failed: HTTP 400 invalid_grant"); }, { sleep: noSleep });
  const events = componentEvents([{ name: "google-calendar", success: false, error: r.error, attempts: r.attempts }]);
  assert.equal(calls, 1);
  assert.equal(events[0].outcome, "stopped");
  assert.equal(runStatus({ hasBriefing: true, pushSent: true, events }), "degraded");
});

test("scenario: FCM rejects an oversized payload; the AI agrees; the shortened text is within the limit", () => {
  const error = "FCM returned HTTP 400: Request payload size exceeds the limit";
  const proposal = candidateRepair("firebase-fcm", error);
  const cls = classifyError(error);
  const verdict = validateAiVerdict({ success: true, diagnosis: { diagnosis: "payload too large", severity: "medium", canAutoFix: true, confidence: 85, recommendedAction: "shorten" } });
  const gate = safetyGate({ repair: proposal, severity: "medium", category: cls.category, mentionsSecrets: cls.mentionsSecrets, requireAi: true, aiCanAutoFix: verdict.canAutoFix, aiConfidence: verdict.confidence });
  assert.equal(gate.allowed, true);
  const long = Array.from({ length: 300 }, (_, i) => `line ${i} ${"x".repeat(20)}`).join("\n");
  assert.ok(byteLength(truncateToBytes(long, 1800).text) <= 1800);
});

test("scenario: the same FCM failure is NOT repaired when the AI disagrees or is unsure", () => {
  const error = "FCM returned HTTP 400: Request payload size exceeds the limit";
  const cls = classifyError(error);
  for (const verdict of [
    { canAutoFix: false, confidence: 95 },
    { canAutoFix: true, confidence: 40 },
    { canAutoFix: false, confidence: 0 },
  ]) {
    const gate = safetyGate({ repair: candidateRepair("firebase-fcm", error), severity: "medium", category: cls.category, requireAi: true, aiCanAutoFix: verdict.canAutoFix, aiConfidence: verdict.confidence });
    assert.equal(gate.allowed, false);
  }
});

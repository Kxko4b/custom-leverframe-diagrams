// Run with:  node --test "tests/*.test.mjs"
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { attentionGuide, eventsNeedingAttention, anyRetryable } = require("../js/attention-admin.js");
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const ev = (o) => ({ kind: "escalation", component: "x", severity: "high", outcome: "stopped", found: "", action: "", ...o });

test("a 401 on request-counts gets exact steps naming the right secret", () => {
  const g = attentionGuide(ev({ component: "request-counts", found: "Could not load pending requests: HTTP 401" }));
  assert.match(g.title, /not allowed to count/);
  assert.ok(g.steps.some(s => /SUPABASE_SERVICE_ROLE_KEY/.test(s)));
  assert.ok(g.steps.some(s => /Edge Functions → Secrets/.test(s)));
  assert.equal(g.canRetry, true);
});

test("a missing secret names the secret and says retrying cannot help", () => {
  const g = attentionGuide(ev({ component: "firebase-fcm", found: "Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY" }));
  assert.match(g.title, /missing/i);
  assert.match(g.steps.join(" "), /FIREBASE_CLIENT_EMAIL/);
  assert.equal(g.canRetry, false);
});

test("an expired Google login explains how to get a new token", () => {
  const g = attentionGuide(ev({ component: "google-calendar", found: "Google token refresh failed: HTTP 400 invalid_grant" }));
  assert.match(g.steps.join(" "), /GOOGLE_REFRESH_TOKEN/);
  assert.match(g.steps.join(" "), /Testing/);
});

test("zero WebUntis lessons is a judgment call, not something a retry fixes", () => {
  const g = attentionGuide(ev({ component: "webuntis", severity: "medium", outcome: "reported", found: "WebUntis returned 0 lessons on a weekday." }));
  assert.equal(g.canRetry, false);
  assert.match(g.steps[0], /holiday/);
});

test("an unknown problem still gets usable steps", () => {
  const g = attentionGuide(ev({ component: "mystery", found: "something odd" }));
  assert.ok(g.steps.length >= 3);
  assert.equal(g.canRetry, true);
});

test("guides never contain anything that looks like a secret value", () => {
  for (const found of ["HTTP 401", "invalid_grant", "Missing GOOGLE_CLIENT_SECRET", "0 lessons", "FCM returned HTTP 503"]) {
    for (const component of ["request-counts", "google-calendar", "firebase-fcm", "webuntis", "weather", "ai-review", "other"]) {
      const g = attentionGuide(ev({ component, found }));
      assert.doesNotMatch(JSON.stringify(g), /eyJ|-----BEGIN|sb_secret|Bearer /);
    }
  }
});

test("only unresolved problems are listed (AI notes, fixed items and manual-retry notes are not)", () => {
  const list = eventsNeedingAttention([
    ev({ outcome: "stopped" }),
    ev({ kind: "check", outcome: "reported", severity: "medium" }),
    ev({ kind: "check", outcome: "reported", severity: "low" }),
    ev({ kind: "repair", outcome: "fixed", severity: "low" }),
    ev({ kind: "ai", outcome: "reported", severity: "medium" }),
    ev({ kind: "repair", component: "manual-retry", outcome: "ok", severity: "info" }),
  ]);
  assert.equal(list.length, 2);
  assert.deepEqual(eventsNeedingAttention(null), []);
});

test("the button is only enabled when a retry could actually help", () => {
  assert.equal(anyRetryable([ev({ component: "firebase-fcm", found: "Missing FIREBASE_PROJECT_ID" })]), false);
  assert.equal(anyRetryable([ev({ component: "weather", outcome: "reported", severity: "medium", found: "HTTP 503" })]), true);
  assert.equal(anyRetryable([]), false);
});

test("the retry migration is admin-only, rate-limited and never exposes the cron command", () => {
  const sql = read("../supabase/briefing-manual-retry.sql");
  assert.match(sql, /security definer/);
  assert.match(sql, /haleannson@gmail\.com/);
  assert.match(sql, /interval '3 minutes'/);
  assert.match(sql, /revoke all on function public\.request_briefing_retry\(\) from public, anon/);
  assert.match(sql, /grant execute on function public\.request_briefing_retry\(\) to authenticated/);
  assert.ok(!sql.split('\n').some(l => /^\s*return\b/.test(l) && /\bcmd\b/.test(l)));          // the command (with the secret) is never returned
  assert.doesNotMatch(sql, /drop |truncate|delete from/i);
});

test("the page has the attention window, loads the script, and asks before re-running", () => {
  const html = read("../admin/index.html");
  assert.match(html, /id="briefing-attention"/);
  assert.match(html, /attention-admin\.js\?v=\w+/);
  const js = read("../js/attention-admin.js");
  assert.match(js, /confirm\(/);
  assert.match(js, /rpc\("request_briefing_retry"\)/);
  assert.doesNotMatch(js, /innerHTML/);
  assert.match(read("../js/briefing-admin.js"), /renderAttentionPanel/);
});

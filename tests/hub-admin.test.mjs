// Run with:  node --test "tests/*.test.mjs"
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { safeUrl, csvCell, requestsToCsv, needsAttention, navBadgeCounts, recentActivity, activityWhen } = require("../js/hub-admin.js");
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

const NOW = Date.parse("2026-10-19T12:00:00Z");
const hoursAgo = (h) => new Date(NOW - h * 3600000).toISOString();

test("only http(s) links from customers are clickable", () => {
  assert.equal(safeUrl("https://example.com/a.png"), "https://example.com/a.png");
  assert.equal(safeUrl("http://example.com/a"), "http://example.com/a");
  assert.equal(safeUrl("javascript:alert(1)"), "");
  assert.equal(safeUrl("JaVaScRiPt:alert(1)"), "");
  assert.equal(safeUrl("data:text/html,<script>1</script>"), "");
  assert.equal(safeUrl("  javascript:alert(1)"), "");
  assert.equal(safeUrl(""), "");
  assert.equal(safeUrl(null), "");
  assert.equal(safeUrl("<img src=x onerror=1>", "https://example.com/"), "https://example.com/%3Cimg%20src=x%20onerror=1%3E");
});

test("CSV cells are quoted and neutralise spreadsheet formulas", () => {
  assert.equal(csvCell("plain"), "plain");
  assert.equal(csvCell("a;b"), '"a;b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell("line1\nline2"), '"line1\nline2"');
  assert.equal(csvCell("=HYPERLINK(\"http://evil\")"), '"\'=HYPERLINK(""http://evil"")"');
  assert.equal(csvCell("+1"), "'+1");
  assert.equal(csvCell("@SUM(A1)"), "'@SUM(A1)");
  assert.equal(csvCell(null), "");
});

test("the CSV has a BOM, German separators, and prices with a decimal comma", () => {
  const csv = requestsToCsv(
    [{ id: 1, request_code: "KXD-0001", created_at: "2026-10-01T10:00:00Z", name: "A; B", status: "Completed" },
     { id: 2, created_at: null, name: null, status: null }],
    [{ request_id: 1, amount: "10.5" }],
  );
  assert.ok(csv.startsWith("﻿Code;Date;Name;"));
  const lines = csv.trim().split("\r\n");
  assert.equal(lines.length, 3);
  assert.equal(lines[1], 'KXD-0001;2026-10-01;"A; B";;;;;Completed;10,50');
  assert.equal(lines[2], "KXD-0002;;;;;;;Pending;");
});

test("old pending requests and unanswered questions are flagged", () => {
  const items = needsAttention({
    requests: [{ status: "Pending", created_at: hoursAgo(80) }, { status: "Pending", created_at: hoursAgo(1) }, { status: "Completed", created_at: hoursAgo(500) }],
    questions: [{ status: "Pending" }, { status: "Answered" }],
    latestRun: { run_at: hoursAgo(7), status: "healthy" }, now: NOW,
  });
  assert.equal(items[0].text, "2 pending requests, 1 waiting more than 2 days");
  assert.equal(items[0].tone, "bad");   // something has waited too long
  assert.equal(items[0].view, "requests");
  assert.equal(items[1].text, "1 unanswered question");
  assert.equal(items[2].tone, "good");
});

test("a recent pending request is just 'waiting' (yellow), not an alarm", () => {
  const [item] = needsAttention({ requests: [{ status: "Pending", created_at: hoursAgo(3) }], questions: [], latestRun: { run_at: hoursAgo(2), status: "healthy" }, now: NOW });
  assert.equal(item.tone, "warn");
  assert.equal(item.text, "1 pending request");
});

test("a briefing that did not run, is old, or is unhealthy is called out", () => {
  const none = needsAttention({ requests: [], questions: [], latestRun: undefined, now: NOW });
  assert.match(none[0].text, /No briefing has been recorded/);
  const stale = needsAttention({ requests: [], questions: [], latestRun: { run_at: hoursAgo(40), status: "healthy" }, now: NOW });
  assert.equal(stale[0].tone, "bad");
  assert.match(stale[0].text, /40 hours ago/);
  const bad = needsAttention({ requests: [], questions: [], latestRun: { run_at: hoursAgo(2), status: "degraded" }, now: NOW });
  assert.equal(bad[0].tone, "bad");
  const repaired = needsAttention({ requests: [], questions: [], latestRun: { run_at: hoursAgo(2), status: "repaired" }, now: NOW });
  assert.equal(repaired[0].tone, "good");
});

test("empty or broken data never crashes the hub", () => {
  assert.equal(needsAttention({ requests: null, questions: null, latestRun: null, now: NOW }).length, 1);
  assert.deepEqual(navBadgeCounts(null, undefined), { requests: 0, questions: 0 });
});

test("badge counts only count Pending items (missing status counts as Pending)", () => {
  assert.deepEqual(
    navBadgeCounts([{ status: "Pending" }, { status: null }, { status: "Completed" }], [{ status: "Pending" }, { status: "Answered" }]),
    { requests: 2, questions: 1 },
  );
});

test("the admin page wires the hub in: card, export button, script, safe links, layout fixes", () => {
  const html = read("../admin/index.html");
  assert.match(html, /id="hub-attention-list"/);
  assert.match(html, /id="export-requests"/);
  assert.match(html, /hub-admin\.js\?v=\w+/);
  assert.match(html, /\.hub-row/);
  assert.match(read("../js/admin.js"), /typeof loadHub === "function"/);
  const requests = read("../js/requests-admin.js");
  assert.match(requests, /safeUrl\(image\.image_url\)/);
  assert.match(requests, /safeUrl\(file\.file_url\)/);
  assert.match(requests, /toFixed\(2\)/);
});

test("question text is rendered without template whitespace", () => {
  assert.doesNotMatch(read("../js/questions-admin.js"), /<p>\s*\n\s*\$\{escapeHTML/);
});

test("recent activity mixes requests, questions and reviews, newest first, capped", () => {
  const items = recentActivity({
    now: NOW,
    requests: [{ id: 7, status: "Pending", created_at: hoursAgo(1), request_code: "KXD-0007" }, { id: 3, status: "Completed", created_at: hoursAgo(50) }],
    questions: [{ id: 1, status: "Answered", created_at: hoursAgo(30), question_code: "KXQ-0001" }],
    reviews: [{ id: 2, name: "Sam", rating: 4, created_at: hoursAgo(5) }],
    limit: 3,
  });
  assert.deepEqual(items.map((i) => i.kind), ["request", "review", "question"]);
  assert.equal(items[0].title, "Request KXD-0007");
  assert.equal(items[0].detail, "New request");
  assert.equal(items[1].title, "Review from Sam");
  assert.equal(items[1].detail, "★★★★ rating");
  assert.equal(items[2].detail, "Answered");
  assert.deepEqual(items.map((i) => i.view), ["requests", "reviews", "questions"]);
});

test("recent activity falls back gracefully and sorts undated rows last", () => {
  const items = recentActivity({
    now: NOW,
    requests: [{ id: 12, created_at: null }, { id: 5, status: "In Progress", created_at: hoursAgo(2) }],
    questions: [], reviews: [{ id: 1, created_at: hoursAgo(3) }],
  });
  assert.equal(items[0].title, "Request KXD-0005");
  assert.equal(items[0].detail, "In Progress");
  assert.equal(items[1].title, "Review");
  assert.equal(items[1].detail, "New review");
  assert.equal(items.at(-1).title, "Request KXD-0012");
  assert.equal(items.at(-1).when, "");
  assert.deepEqual(recentActivity({ now: NOW }), []);
});

test("activity times read as clock time today, Yesterday, or a short date (Berlin time)", () => {
  assert.equal(activityWhen("2026-10-19T04:12:00Z", NOW), "06:12");
  assert.equal(activityWhen("2026-10-18T09:00:00Z", NOW), "Yesterday");
  assert.equal(activityWhen("2026-10-14T09:00:00Z", NOW), "14 Oct");
  assert.equal(activityWhen("not a date", NOW), "");
});

test("the Home screen shows the activity list and the Requests chips match the real statuses", () => {
  const html = read("../admin/index.html");
  assert.match(html, /id="hub-recent-list"/);
  assert.match(read("../js/hub-admin.js"), /renderRecentActivity\(recentActivity\(/);
  const selectValues = [...html.match(/<select id="filter"[\s\S]*?<\/select>/)[0].matchAll(/<option value="([^"]+)"/g)].map((m) => m[1]);
  const chipValues = [...html.matchAll(/class="chip[^"]*" data-filter="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(chipValues, selectValues);
  assert.match(html, /app-polish-admin\.js\?v=\w+/);
});

test("activity rows are built from text nodes only (customer text never reaches innerHTML)", () => {
  const js = read("../js/hub-admin.js");
  const body = js.slice(js.indexOf("function renderRecentActivity"), js.indexOf("async function loadHubInner"));
  assert.doesNotMatch(body.replace(/icon\.innerHTML = `<svg viewBox="0 0 24 24">\$\{ACTIVITY_ICONS\[item\.kind\] \|\| ""\}<\/svg>`;[^\n]*/, ""), /innerHTML/);
});

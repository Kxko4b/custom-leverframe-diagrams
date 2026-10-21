// Run with:  node --test "tests/*.test.mjs"
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { parsePrice, formatMoney, summarizeEarnings } = require("../js/earnings-admin.js");
const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

test("prices accept German and English notation", () => {
  assert.equal(parsePrice("12,50"), 12.5);
  assert.equal(parsePrice("12.5"), 12.5);
  assert.equal(parsePrice(" 12 € "), 12);
  assert.equal(parsePrice("1.234,50"), 1234.5);
  assert.equal(parsePrice("1,234.50"), 1234.5);
  assert.equal(parsePrice("0"), 0);
});

test("empty means no price, nonsense is rejected (never saved as 0)", () => {
  assert.equal(parsePrice(""), null);
  assert.equal(parsePrice("   "), null);
  assert.equal(parsePrice(null), null);
  assert.equal(parsePrice("abc"), undefined);
  assert.equal(parsePrice("-5"), undefined);
  assert.equal(parsePrice("1,234"), undefined);
  assert.equal(parsePrice("12,5,5"), undefined);
  assert.equal(parsePrice("1e5"), undefined);
});

test("money is shown in euros", () => {
  assert.match(formatMoney(12.5), /12,50\s*€/);
  assert.match(formatMoney(0), /0,00\s*€/);
  assert.match(formatMoney("nope"), /0,00\s*€/);
});

test("earned counts only Completed requests that have a price", () => {
  const requests = [
    { id: 1, status: "Completed" }, { id: 2, status: "Completed" }, { id: 3, status: "Completed" },
    { id: 4, status: "In Progress" }, { id: 5, status: "Accepted" }, { id: 6, status: "Pending" }, { id: 7, status: "Cancelled" },
  ];
  const payments = [
    { request_id: 1, amount: "10.10" }, { request_id: 2, amount: 0.2 },
    { request_id: 4, amount: 5 }, { request_id: 5, amount: 7.5 }, { request_id: 7, amount: 99 },
  ];
  const t = summarizeEarnings(requests, payments);
  assert.equal(t.earned, 10.3);          // no floating point drift
  assert.equal(t.open, 12.5);            // In Progress + Accepted, not Cancelled
  assert.equal(t.paidCount, 2);
  assert.equal(t.completedWithoutPrice, 1);
});

test("empty and broken input gives zeros instead of crashing", () => {
  assert.deepEqual(summarizeEarnings(null, null), { earned: 0, open: 0, paidCount: 0, completedWithoutPrice: 0 });
  assert.equal(summarizeEarnings([{ id: 1, status: "Completed" }], [{ request_id: 1, amount: "oops" }]).earned, 0);
});

test("ids match whether the database sends numbers or strings", () => {
  assert.equal(summarizeEarnings([{ id: 1, status: "Completed" }], [{ request_id: "1", amount: 4 }]).earned, 4);
});

test("the price never goes into the public requests table", () => {
  const js = read("../js/requests-admin.js");
  assert.match(js, /delete values\.price/);
  assert.match(js, /from\("request_payments"\)/);
});

test("the payments migration is additive and admin-only", () => {
  const sql = read("../supabase/request-payments.sql").toLowerCase();
  assert.doesNotMatch(sql, /drop table|truncate|delete from|alter table public\.requests/);
  assert.match(sql, /alter table public\.request_payments enable row level security/);
  assert.match(sql, /revoke all on public\.request_payments from anon, authenticated/);
  assert.doesNotMatch(sql, /to anon|using\s*\(\s*true\s*\)/);
  assert.equal([...sql.matchAll(/haleannson@gmail\.com/g)].length, 2);
});

test("the admin page has the earnings banner, KXKOS window, and loads scripts in order", () => {
  const html = read("../admin/index.html");
  assert.match(html, /id="earnings-summary"/);
  assert.match(html, /showAdminView\('kxkos'\)/);
  assert.match(html, /id="kxkos-view"/);
  assert.match(html, /href="https:\/\/kxko4b\.github\.io\/KXKOS\/"[^>]*target="_blank"[^>]*rel="noopener"/);
  assert.ok(html.indexOf("earnings-admin.js") > 0 && html.indexOf("earnings-admin.js") < html.indexOf("requests-admin.js"));
});

test("the admin windows can never sit on 'Loading' forever", () => {
  const admin = read("../js/admin.js");
  // loaders live in later scripts, so the session check must wait for the page to finish loading
  assert.match(admin, /addEventListener\("load", checkSession\)/);
  assert.doesNotMatch(admin, /^checkSession\(\);/m);
  for (const file of ["../js/requests-admin.js", "../js/briefing-admin.js"]) {
    const js = read(file);
    assert.match(js, /Promise\.race/, file);
    assert.match(js, /did not answer within 20 seconds/, file);
  }
});

test("the Overview shows the earned amount too", () => {
  assert.match(read("../admin/index.html"), /id="stat-earned"/);
  assert.match(read("../js/requests-admin.js"), /getElementById\("stat-earned"\)/);
});

test("admin scripts carry a version tag so a stale browser cache cannot hide new windows", () => {
  const html = read("../admin/index.html");
  const tags = [...html.matchAll(/<script src="\.\.\/js\/([\w.-]+\.js)([^"]*)"/g)];
  assert.ok(tags.length >= 8);
  for (const [, name, query] of tags) assert.match(query, /^\?v=\w+$/, name);
});

test("request details are hidden until the card is opened", () => {
  const html = read("../admin/index.html");
  assert.match(html, /\.request-card \.request-content\s*\{\s*display:\s*none;/);
  assert.match(html, /\.request-card\.open \.request-content\s*\{\s*display:\s*block;/);
});

test("the admin exposes window.kxkoRefresh for the Android app and never interrupts typing", () => {
  const admin = read("../js/admin.js");
  assert.match(admin, /window\.kxkoRefresh = async function/);
  assert.match(admin, /INPUT\|TEXTAREA\|SELECT/);
  assert.match(read("../admin/index.html"), /KxkoApp\\\//);
});

test("the app's back button and haptic bridge exist and the tab bar docks to the bottom inside the app", () => {
  assert.match(read("../js/admin.js"), /window\.kxkoBack = function/);
  assert.match(read("../js/admin.js"), /KxkoNative\?\.tick\(\)/);
  assert.match(read("../admin/index.html"), /html\.kxko-app \.sidebar \{ position: fixed; inset: auto 0 0 0/);
});

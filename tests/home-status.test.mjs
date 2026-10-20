// Run with:  node --test "tests/*.test.mjs"
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const js = readFileSync(new URL("../js/home-status.js", import.meta.url), "utf8");

test("a request code shows the owner's updates and file links, fetched by code only", () => {
  assert.match(js, /rpc\("get_request_status"/);
  assert.match(js, /request_update_files/);
  assert.doesNotMatch(js, /from\("request_updates"\)|from\("requests"\)/);
});

test("a question code shows the question and its answer, or says it is still open", () => {
  assert.match(js, /rpc\("get_question_status"/);
  assert.doesNotMatch(js, /from\("questions"\)/);
  assert.match(js, /Not answered yet/);
});

test("customer-visible text is rendered as text, and only http(s) file links are clickable", () => {
  assert.doesNotMatch(js, /innerHTML/);
  assert.match(js, /protocol === "https:" \|\| url\.protocol === "http:"/);
});

test("an unavailable lookup shows a friendly message", () => {
  assert.match(js, /Status is unavailable right now/);
  assert.match(js, /Updates are unavailable right now/);
});

test("public pages never read the private tables directly", () => {
  for (const f of ["../js/home-status.js", "../status/status.js", "../js/requests.js", "../js/questions.js"]) {
    const code = readFileSync(new URL(f, import.meta.url), "utf8");
    assert.doesNotMatch(code, /from\("(requests|questions|request_updates|request_update_files)"\)\s*\.select/, f);
    assert.doesNotMatch(code, /\.from\("request_images"\)\s*\.select/, f);
  }
});

test("the lockdown migration only exposes lookup-by-code, no emails, and drops the public read policies", () => {
  const sql = readFileSync(new URL("../supabase/public-lockdown.sql", import.meta.url), "utf8");
  assert.match(sql, /security definer/);
  assert.match(sql, /drop policy if exists "Allow request confirmation" on public\.requests/);
  assert.match(sql, /drop policy if exists "Anyone can check questions" on public\.questions/);
  assert.match(sql, /drop policy if exists "Allow public read of update files"/);
  assert.match(sql, /drop policy if exists "Authenticated users can manage request updates"/);
  assert.doesNotMatch(sql, /r\.email|r\.discord/);
});

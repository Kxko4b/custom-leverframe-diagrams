// Run with:  node --test "tests/*.test.mjs"
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const js = readFileSync(new URL("../js/home-status.js", import.meta.url), "utf8");

test("a request code shows the owner's updates and file links", () => {
  assert.match(js, /from\("request_updates"\)/);
  assert.match(js, /request_update_files \(file_name, file_url\)/);
  assert.match(js, /\.eq\("request_id", row\.id\)/);
});

test("a question code shows the question and its answer, or says it is still open", () => {
  assert.match(js, /question, answer, answered_at/);
  assert.match(js, /Not answered yet/);
});

test("customer-visible text is rendered as text, and only http(s) file links are clickable", () => {
  assert.doesNotMatch(js, /innerHTML/);
  assert.match(js, /protocol === "https:" \|\| url\.protocol === "http:"/);
});

test("a failed updates query still shows the status", () => {
  assert.match(js, /updates = null/);
  assert.match(js, /Updates are unavailable right now/);
});

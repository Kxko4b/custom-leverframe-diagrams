import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const m = createRequire(import.meta.url)("../js/exam-learn.js");

test("days label and upcoming list hide past exams", () => {
  assert.equal(m.learnDaysLabel(0), "Today");
  assert.equal(m.learnDaysLabel(1), "Tomorrow");
  assert.equal(m.learnDaysLabel(5), "In 5 days");
  const list = m.learnUpcomingExams([
    { subject: "Late", exam_date: "2026-12-10" }, { subject: "Gone", exam_date: "2026-11-09" },
    { subject: "Today", exam_date: "2026-11-10" }, { subject: "Soon", exam_date: "2026-11-12" }], "2026-11-10");
  assert.deepEqual(list.map(e => e.subject), ["Today", "Soon", "Late"]);
});

test("deck puts missed questions first and respects the size", () => {
  const qs = [
    { id: "ok", right_count: 3, wrong_count: 0 }, { id: "bad", right_count: 0, wrong_count: 2 },
    { id: "new1" }, { id: "new2" }, { id: "meh", right_count: 1, wrong_count: 1 }];
  const deck = m.learnPickDeck(qs, 3, () => 0.5);
  assert.equal(deck[0].id, "bad");
  assert.equal(deck.length, 3);
  assert.ok(!deck.some(q => q.id === "ok"));
});

test("shuffle keeps all items and does not mutate", () => {
  const src = [1, 2, 3, 4, 5];
  const out = m.learnShuffle(src);
  assert.deepEqual(src, [1, 2, 3, 4, 5]);
  assert.deepEqual(out.slice().sort(), src);
});

test("match + score text", () => {
  assert.equal(m.learnMatchCorrect(2, 2), true);
  assert.equal(m.learnMatchCorrect(2, 3), false);
  assert.match(m.learnScoreText(10, 10), /Perfect/);
  assert.match(m.learnScoreText(1, 10), /run it again/);
  assert.equal(m.learnScoreText(0, 0), "No questions answered.");
});

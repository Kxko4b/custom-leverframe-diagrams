/* Learn card: upcoming exams, topic notes, AI quiz (covered answers, word matching, multiple choice).
   Pure helpers are unit-tested in tests/exam-learn.test.mjs; the UI at the bottom only runs in the browser.
   All text comes from the owner or the AI, so it is only ever put on the page with textContent. */

const LEARN_TZ = "Europe/Berlin";
const LEARN_DECK_SIZE = 10;

function learnTodayIso(now) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: LEARN_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now || new Date());
}

function learnDaysUntil(todayIso, dateIso) {
    const a = Date.parse(todayIso + "T00:00:00Z"), b = Date.parse(String(dateIso).slice(0, 10) + "T00:00:00Z");
    return Math.round((b - a) / 86400000);
}

function learnDaysLabel(days) {
    if (days < 0) return "Done";
    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    return "In " + days + " days";
}

/** Upcoming first (today and later), soonest first. Past exams are not shown. */
function learnUpcomingExams(exams, todayIso) {
    return (exams || [])
        .map(e => ({ ...e, days: learnDaysUntil(todayIso, e.exam_date) }))
        .filter(e => Number.isFinite(e.days) && e.days >= 0)
        .sort((a, b) => a.days - b.days);
}

function learnShuffle(items, rand) {
    const out = items.slice();
    const random = rand || Math.random;
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

/** Today's deck: what you got wrong comes first, then what you saw least recently; ties are shuffled. */
function learnPickDeck(questions, size, rand) {
    const limit = size || LEARN_DECK_SIZE;
    const weight = q => (q.wrong_count || 0) * 3 - (q.right_count || 0);
    return learnShuffle(questions || [], rand)
        .sort((a, b) => weight(b) - weight(a) || String(a.last_seen || "").localeCompare(String(b.last_seen || "")))
        .slice(0, limit);
}

/** Matching game: is the chosen answer the partner of the chosen term? Pairs are identified by index. */
function learnMatchCorrect(termIndex, matchIndex) {
    return termIndex === matchIndex;
}

function learnScoreText(right, total) {
    if (!total) return "No questions answered.";
    const pct = Math.round((right / total) * 100);
    const word = pct === 100 ? "Perfect." : pct >= 70 ? "Solid." : pct >= 40 ? "Getting there." : "Rough one, run it again.";
    return right + " of " + total + " right (" + pct + "%). " + word;
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { learnTodayIso, learnDaysUntil, learnDaysLabel, learnUpcomingExams, learnShuffle, learnPickDeck, learnMatchCorrect, learnScoreText };
}

/* ---------------- browser only ---------------- */

(function () {
    if (typeof document === "undefined") return;
    const root = document.getElementById("exam-learn");
    if (!root) return;

    const FUNCTION_URL = "https://ggewdpazpeoielbqrcgm.supabase.co/functions/v1/exam-quiz";
    const API_KEY = "sb_publishable_RZYBKLqjC9UYLNdqlOKZCA_IFX-5Gvm";
    const listEl = document.getElementById("exam-learn-list");
    const stageEl = document.getElementById("exam-learn-stage");
    const msgEl = document.getElementById("exam-learn-message");
    let exams = [], counts = new Map(), openId = null, busy = false;

    const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
    const say = (text, bad) => { msgEl.textContent = text || ""; msgEl.classList.toggle("is-error", Boolean(bad)); };
    const dateLabel = iso => new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: LEARN_TZ }).format(new Date(iso.slice(0, 10) + "T12:00:00"));

    async function load() {
        say("");
        const { data, error } = await db.from("exams").select("id, subject, exam_date, round, topics, note").gte("exam_date", learnTodayIso()).order("exam_date", { ascending: true });
        if (error) { listEl.replaceChildren(el("p", "empty", "Could not load exams: " + error.message)); return; }
        exams = data || [];
        const q = await db.from("exam_questions").select("exam_id").in("exam_id", exams.map(e => e.id).concat(["00000000-0000-0000-0000-000000000000"]));
        counts = new Map();
        for (const row of (q.data || [])) counts.set(row.exam_id, (counts.get(row.exam_id) || 0) + 1);
        renderList();
    }

    function renderList() {
        const upcoming = learnUpcomingExams(exams, learnTodayIso());
        if (!upcoming.length) { listEl.replaceChildren(el("p", "empty", "No upcoming exams. Nice.")); return; }
        listEl.replaceChildren(...upcoming.map(exam => {
            const card = el("div", "learn-exam" + (exam.days <= 3 ? " soon" : "") + (openId === exam.id ? " open" : ""));
            const head = el("button", "learn-exam-head"); head.type = "button";
            const title = el("span", "learn-exam-title");
            title.append(el("strong", "", exam.subject), el("small", "", dateLabel(exam.exam_date) + (exam.round ? " · test " + exam.round : "")));
            const n = counts.get(exam.id) || 0;
            const status = el("span", "learn-exam-status", n ? n + " questions" : exam.topics ? "no quiz yet" : "add topics");
            head.append(title, status, el("span", "learn-chip", learnDaysLabel(exam.days)));
            head.addEventListener("click", () => { openId = openId === exam.id ? null : exam.id; stageEl.replaceChildren(); renderList(); });
            card.append(head);
            if (openId === exam.id) card.append(renderPanel(exam, n));
            return card;
        }));
    }

    function renderPanel(exam, n) {
        const panel = el("div", "learn-panel");
        const label = el("label", "learn-label", "Topic notes (the AI only quizzes what is written here)");
        const area = el("textarea", "learn-topics"); area.rows = 6; area.maxLength = 6000; area.value = exam.topics || "";
        area.placeholder = "e.g. Salze: Ionenbindung, Gitterenergie… vocab, formulas, definitions";
        label.append(area);
        const row = el("div", "learn-actions");
        const save = el("button", "primary", "Save notes"); save.type = "button";
        const make = el("button", "", n ? "Make more questions" : "Make quiz with AI"); make.type = "button";
        const start = el("button", "primary", "Start quiz"); start.type = "button"; start.disabled = !n;

        save.addEventListener("click", async () => {
            const { error } = await db.from("exams").update({ topics: area.value, updated_at: new Date().toISOString() }).eq("id", exam.id);
            if (error) return say("Could not save: " + error.message, true);
            exam.topics = area.value; say("Notes saved."); renderList();
        });
        make.addEventListener("click", async () => {
            if (busy) return;
            if (!area.value.trim()) return say("Write some topic notes first.", true);
            busy = true; make.disabled = true; make.textContent = "Thinking… (up to a minute)"; say("");
            try {
                if (area.value !== exam.topics) {
                    const saved = await db.from("exams").update({ topics: area.value }).eq("id", exam.id);
                    if (saved.error) throw new Error(saved.error.message);
                    exam.topics = area.value;
                }
                const { data: session } = await db.auth.getSession();
                const token = session && session.session && session.session.access_token;
                if (!token) throw new Error("Your admin session expired. Sign in again.");
                const res = await fetch(FUNCTION_URL, { method: "POST", headers: { apikey: API_KEY, Authorization: "Bearer " + token, "Content-Type": "application/json" }, body: JSON.stringify({ exam_id: exam.id }) });
                const body = await res.json().catch(() => ({}));
                if (!res.ok || !body.success) throw new Error(body.error || "Quiz request failed (HTTP " + res.status + ").");
                say(body.added + " new questions added.");
                await load();
            } catch (error) { say(error.message, true); }
            finally { busy = false; }
        });
        start.addEventListener("click", () => runQuiz(exam));
        row.append(save, make, start);
        panel.append(label, row);
        return panel;
    }

    async function runQuiz(exam, extended = false) {
        const { data, error } = await db.from("exam_questions")
            .select("id, kind, payload, right_count, wrong_count, last_seen")
            .eq("exam_id", exam.id);
        if (error) return say("Could not load questions: " + error.message, true);

        const deck = learnPickDeck(data || [], extended ? 20 : LEARN_DECK_SIZE);
        if (!deck.length) return say("No questions yet. Make a quiz first.", true);
        if (extended && deck.length < 10) return say("The extended test needs at least 10 questions. Generate more questions first.", true);

        let index = 0, secondsLeft = estimateSeconds(deck), finished = false, submitting = false;
        const answers = new Map();
        const flagged = new Set();
        let timerId = null;

        function estimateSeconds(items) {
            const raw = items.reduce((sum, q) => sum + (q.kind === "choice" ? 18 : q.kind === "match" ? 25 : 30), 0);
            return Math.max(extended ? 300 : 180, Math.min(extended ? 900 : 300, raw));
        }
        function formatTime(seconds) {
            const s = Math.max(0, seconds);
            return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
        }
        function hasAnswer(q, value) {
            if (value === undefined || value === null) return false;
            return typeof value === "number" || String(value).trim().length > 0;
        }
        function isAnswered(q) {
            return answers.has(q.id) && hasAnswer(q, answers.get(q.id));
        }
        function answeredCount() { return deck.filter(isAnswered).length; }
        function questionText(q) {
            if (q.kind === "choice") return q.payload.question;
            if (q.kind === "match") return "Match each term with its meaning. Write the term and its matching meaning on separate lines:\n\n" + q.payload.pairs.map(p => "• " + p.term).join("\n");
            return q.payload.front;
        }
        function referenceAnswer(q) {
            if (q.kind === "choice") return String(q.payload.options[q.payload.answer] || "");
            if (q.kind === "match") return q.payload.pairs.map(p => p.term + " = " + p.match).join("\n");
            return String(q.payload.back || "");
        }
        function setAnswer(q, value) {
            answers.set(q.id, value);
            const count = document.getElementById("learn-answered-count");
            if (count) count.textContent = answeredCount() + " / " + deck.length + " answered";
            const current = document.querySelector(".learn-question-nav button[data-q-index='" + index + "']");
            if (current) current.classList.toggle("is-answered", isAnswered(q));
            renderPalette();
        }
        function renderPalette() {
            const palette = document.getElementById("learn-question-palette");
            if (!palette) return;
            palette.replaceChildren();
            deck.forEach((q, i) => {
                const b = el("button", "learn-palette-item" + (i === index ? " is-current" : "") + (isAnswered(q) ? " is-answered" : "") + (flagged.has(q.id) ? " is-flagged" : ""));
                b.type = "button";
                b.textContent = String(i + 1);
                b.setAttribute("aria-label", "Question " + (i + 1) + (isAnswered(q) ? ", answered" : ", unanswered") + (flagged.has(q.id) ? ", flagged for review" : ""));
                b.addEventListener("click", () => { index = i; show(); });
                palette.append(b);
            });
        }
        function stopTimer() {
            if (timerId !== null) clearInterval(timerId);
            timerId = null;
        }
        function frame(q) {
            const box = el("div", "learn-quiz learn-exam-mode");
            const head = el("div", "learn-exam-topline");
            const meta = el("div", "learn-exam-meta");
            meta.append(el("small", "learn-count", (extended ? "EXTENDED TEST" : "TIMED PRACTICE") + " · " + exam.subject),
                el("strong", "learn-question-heading", "Question " + (index + 1) + " of " + deck.length));
            const clock = el("strong", "learn-timer" + (secondsLeft <= 30 ? " is-low" : ""), formatTime(secondsLeft));
            clock.id = "learn-exam-timer";
            head.append(meta, clock);
            const progress = el("div", "learn-progress");
            const fill = el("span");
            fill.style.width = Math.round((answeredCount() / deck.length) * 100) + "%";
            progress.append(fill);
            const status = el("div", "learn-answer-status");
            status.id = "learn-answered-count";
            status.textContent = answeredCount() + " / " + deck.length + " answered";
            box.append(head, progress, status);
            return box;
        }
        function show() {
            if (finished) return;
            const q = deck[index];
            const box = frame(q);
            const card = el("div", "learn-card");
            card.append(el("p", "learn-front", questionText(q)));
            const saved = answers.get(q.id);
            if (q.kind === "choice") {
                const options = el("div", "learn-options");
                q.payload.options.forEach((text, i) => {
                    const b = el("button", "learn-option" + (saved === i ? " selected" : ""), text);
                    b.type = "button";
                    b.setAttribute("aria-pressed", saved === i ? "true" : "false");
                    b.addEventListener("click", () => {
                        options.querySelectorAll("button").forEach((option, j) => {
                            option.classList.toggle("selected", i === j);
                            option.setAttribute("aria-pressed", i === j ? "true" : "false");
                        });
                        setAnswer(q, i);
                    });
                    options.append(b);
                });
                card.append(options);
            } else {
                const answer = el("textarea", "learn-written-answer");
                answer.rows = q.kind === "match" ? 5 : 4;
                answer.maxLength = 2500;
                answer.placeholder = q.kind === "match" ? "Write each matching pair…" : "Type your answer here…";
                answer.value = typeof saved === "string" ? saved : "";
                answer.setAttribute("aria-label", "Your answer to question " + (index + 1));
                answer.addEventListener("input", () => setAnswer(q, answer.value));
                card.append(answer);
            }

            const review = el("button", "learn-flag" + (flagged.has(q.id) ? " is-flagged" : ""), flagged.has(q.id) ? "⚑ Flagged for review" : "⚐ Flag for review");
            review.type = "button";
            review.addEventListener("click", () => { if (flagged.has(q.id)) flagged.delete(q.id); else flagged.add(q.id); show(); });
            card.append(review);

            const nav = el("div", "learn-exam-nav");
            const previous = el("button", "", "← Previous");
            previous.type = "button"; previous.disabled = index === 0;
            previous.addEventListener("click", () => { if (index > 0) { index--; show(); } });
            const next = el("button", "primary", index === deck.length - 1 ? "Review answers →" : "Next →");
            next.type = "button";
            next.addEventListener("click", () => { if (index < deck.length - 1) { index++; show(); } else showReview(); });
            nav.append(previous, next);
            const overview = el("div", "learn-question-nav");
            overview.append(el("strong", "", "Question overview"));
            const palette = el("div", "");
            palette.id = "learn-question-palette";
            overview.append(palette);
            card.append(nav, overview);
            box.append(card);
            stageEl.replaceChildren(box);
            renderPalette();
            stageEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
        function showReview() {
            const unanswered = deck.filter(q => !isAnswered(q)).length;
            const box = el("div", "learn-quiz learn-review-screen");
            box.append(el("h4", "", "Review your answers"), el("p", "", answeredCount() + " of " + deck.length + " questions answered."));
            const stats = el("div", "learn-review-stats");
            stats.append(el("span", "", unanswered + " unanswered"), el("span", "", flagged.size + " flagged for review"));
            box.append(stats);
            if (unanswered) box.append(el("p", "learn-review-warning", "You still have " + unanswered + " unanswered question" + (unanswered === 1 ? "" : "s") + ". You can return to them before submitting."));
            const nav = el("div", "learn-question-nav");
            const palette = el("div", ""); palette.id = "learn-question-palette";
            deck.forEach((q, i) => {
                const b = el("button", "learn-palette-item" + (isAnswered(q) ? " is-answered" : "") + (flagged.has(q.id) ? " is-flagged" : ""));
                b.type = "button"; b.textContent = String(i + 1);
                b.addEventListener("click", () => { index = i; show(); });
                palette.append(b);
            });
            nav.append(el("strong", "", "Jump to a question"), palette);
            const actions = el("div", "learn-actions");
            const back = el("button", "", "← Back to questions"); back.type = "button"; back.addEventListener("click", show);
            const submit = el("button", "primary", "Submit test"); submit.type = "button"; submit.addEventListener("click", () => submitTest(false));
            actions.append(back, submit);
            box.append(nav, actions);
            stageEl.replaceChildren(box);
        }
        async function submitTest(autoSubmit) {
            if (finished || submitting) return;
            const unanswered = deck.filter(q => !isAnswered(q)).length;
            if (!autoSubmit && unanswered && !confirm("You have " + unanswered + " unanswered question(s). Submit anyway?")) return;
            submitting = true;
            stopTimer();
            const box = el("div", "learn-quiz learn-grading");
            box.append(el("h4", "", "Marking your answers…"), el("p", "", "The AI is checking written answers against the reference answers and marking scheme."));
            stageEl.replaceChildren(box);
            try {
                const written = deck.filter(q => q.kind !== "choice");
                let graded = [];
                if (written.length) {
                    const { data: session } = await db.auth.getSession();
                    const token = session && session.session && session.session.access_token;
                    if (!token) throw new Error("Your admin session expired. Sign in again.");
                    const response = await fetch(FUNCTION_URL, {
                        method: "POST",
                        headers: { apikey: API_KEY, Authorization: "Bearer " + token, "Content-Type": "application/json" },
                        body: JSON.stringify({
                            action: "grade",
                            exam_id: exam.id,
                            answers: written.map(q => ({ id: q.id, question: questionText(q), answer: String(answers.get(q.id) || ""), reference: referenceAnswer(q), kind: q.kind }))
                        })
                    });
                    const body = await response.json().catch(() => ({}));
                    if (!response.ok || !body.success) throw new Error(body.error || "AI grading failed (HTTP " + response.status + ").");
                    graded = Array.isArray(body.results) ? body.results : [];
                }
                const gradeMap = new Map(graded.map(r => [String(r.id), r]));
                let earned = 0;
                const results = deck.map(q => {
                    const answer = answers.get(q.id);
                    let points = 0, feedback = "No answer submitted.";
                    if (q.kind === "choice") {
                        points = answer === q.payload.answer ? 1 : 0;
                        feedback = points ? "Correct." : "Reference answer: " + referenceAnswer(q);
                        if (q.payload.explain) feedback += " " + q.payload.explain;
                    } else {
                        const result = gradeMap.get(String(q.id));
                        points = Math.max(0, Math.min(1, Number(result?.points) || 0));
                        feedback = String(result?.feedback || "No marking feedback was returned.");
                    }
                    earned += points;
                    return { q, answer, points, feedback };
                });
                await Promise.allSettled(results.map(r => db.from("exam_questions").update({
                    right_count: (r.q.right_count || 0) + (r.points >= 0.75 ? 1 : 0),
                    wrong_count: (r.q.wrong_count || 0) + (r.points >= 0.75 ? 0 : 1),
                    last_seen: new Date().toISOString()
                }).eq("id", r.q.id)));
                finished = true;
                submitting = false;
                renderResults(results, earned, autoSubmit);
            } catch (error) {
                submitting = false;
                const retry = el("button", "primary", "Retry marking");
                retry.type = "button";
                retry.addEventListener("click", () => submitTest(true));
                const message = el("p", "learn-review-warning", "The test answers are still here, but the AI could not finish marking: " + error.message);
                box.replaceChildren(el("h4", "", "Marking could not finish"), message, retry);
                stageEl.replaceChildren(box);
            }
        }
        function renderResults(results, earned, autoSubmit) {
            const total = deck.length;
            const pct = Math.round((earned / total) * 100);
            const box = el("div", "learn-quiz learn-done");
            box.append(el("h4", "", extended ? "Extended test results" : "Practice test results"));
            box.append(el("p", "", earned.toFixed(1).replace(/\.0$/, "") + " / " + total + " points · " + pct + "%"));
            if (autoSubmit) box.append(el("p", "learn-review-warning", "The timer ran out, so the test was submitted automatically."));
            if (extended) {
                const grade = pct >= 95 ? 1 : pct >= 80 ? 2 : pct >= 65 ? 3 : pct >= 50 ? 4 : pct >= 25 ? 5 : 6;
                const labels = {1:"sehr gut",2:"gut",3:"befriedigend",4:"ausreichend",5:"mangelhaft",6:"ungenügend"};
                box.append(el("div", "learn-final-grade", "Grade " + grade + " · " + labels[grade]));
                box.append(el("p", "learn-muted-note", "Indicative grading scale: 1 ≥ 95%, 2 ≥ 80%, 3 ≥ 65%, 4 ≥ 50%, 5 ≥ 25%, otherwise 6."));
            }
            const details = el("div", "learn-result-list");
            results.forEach((r, i) => {
                const item = el("article", "learn-result-item " + (r.points >= 0.75 ? "is-right" : "is-wrong"));
                item.append(el("strong", "", (i + 1) + ". " + questionText(r.q)));
                item.append(el("p", "learn-result-answer", "Your answer: " + (typeof r.answer === "number" ? r.q.payload.options[r.answer] : String(r.answer || "—"))));
                item.append(el("p", "learn-result-feedback", Math.round(r.points * 100) + "% credit · " + r.feedback));
                item.append(el("p", "learn-result-reference", "Reference: " + referenceAnswer(r.q)));
                details.append(item);
            });
            box.append(details);
            const actions = el("div", "learn-actions");
            if (!extended) {
                const bigger = el("button", "primary", "Take a larger test (20 questions)");
                bigger.type = "button"; bigger.disabled = deck.length < 10;
                bigger.addEventListener("click", () => runQuiz(exam, true));
                actions.append(bigger);
                actions.append(el("p", "learn-muted-note", "Want a longer, more realistic test? The extended test receives a German school grade."));
            }
            const again = el("button", "", "Try again"); again.type = "button"; again.addEventListener("click", () => runQuiz(exam, extended));
            const close = el("button", "", "Close"); close.type = "button"; close.addEventListener("click", () => stageEl.replaceChildren());
            actions.append(again, close); box.append(actions);
            stageEl.replaceChildren(box);
        }
        function tick() {
            secondsLeft--;
            const clock = document.getElementById("learn-exam-timer");
            if (clock) { clock.textContent = formatTime(secondsLeft); clock.classList.toggle("is-low", secondsLeft <= 30); }
            if (secondsLeft <= 0) submitTest(true);
        }
        show();
        timerId = setInterval(tick, 1000);
    }

    window.loadExamLearn = load;
    document.querySelector('.nav-button[data-view="briefing"]')?.addEventListener("click", () => load());
    document.getElementById("exam-learn-refresh")?.addEventListener("click", () => load());
})();

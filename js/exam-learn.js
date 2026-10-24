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

    async function runQuiz(exam) {
        const { data, error } = await db.from("exam_questions").select("id, kind, payload, right_count, wrong_count, last_seen").eq("exam_id", exam.id);
        if (error) return say("Could not load questions: " + error.message, true);
        const deck = learnPickDeck(data || [], LEARN_DECK_SIZE);
        if (!deck.length) return say("No questions yet. Make a quiz first.", true);
        let index = 0, right = 0;

        const record = async (q, ok) => {
            if (ok) right++;
            await db.from("exam_questions").update({ right_count: (q.right_count || 0) + (ok ? 1 : 0), wrong_count: (q.wrong_count || 0) + (ok ? 0 : 1), last_seen: new Date().toISOString() }).eq("id", q.id);
        };
        const next = () => { index++; show(); };
        const finish = () => {
            const box = el("div", "learn-quiz learn-done");
            box.append(el("h4", "", "Done: " + exam.subject), el("p", "", learnScoreText(right, deck.length)));
            const again = el("button", "primary", "Another round"); again.type = "button"; again.addEventListener("click", () => runQuiz(exam));
            const close = el("button", "", "Close"); close.type = "button"; close.addEventListener("click", () => stageEl.replaceChildren());
            box.append(el("div", "learn-actions")); box.lastChild.append(again, close);
            stageEl.replaceChildren(box);
        };
        const frame = (q) => {
            const box = el("div", "learn-quiz");
            const bar = el("div", "learn-progress"); const fill = el("span"); fill.style.width = Math.round((index / deck.length) * 100) + "%"; bar.append(fill);
            box.append(el("small", "learn-count", exam.subject + " · " + (index + 1) + " / " + deck.length), bar);
            return box;
        };

        function cover(q) {
            const box = frame(q);
            const card = el("div", "learn-card"); card.append(el("p", "learn-front", q.payload.front));
            const answer = el("button", "learn-covered", "Tap to uncover the answer"); answer.type = "button";
            const buttons = el("div", "learn-actions"); buttons.hidden = true;
            answer.addEventListener("click", () => { answer.textContent = q.payload.back; answer.classList.add("revealed"); buttons.hidden = false; }, { once: true });
            const got = el("button", "primary", "Got it"), miss = el("button", "", "Missed it");
            got.type = miss.type = "button";
            got.addEventListener("click", async () => { await record(q, true); next(); });
            miss.addEventListener("click", async () => { await record(q, false); next(); });
            buttons.append(got, miss); card.append(answer, buttons); box.append(card); return box;
        }

        function choice(q) {
            const box = frame(q);
            const card = el("div", "learn-card"); card.append(el("p", "learn-front", q.payload.question));
            const options = el("div", "learn-options");
            const note = el("p", "learn-explain"); note.hidden = true;
            let answered = false;
            q.payload.options.forEach((text, i) => {
                const b = el("button", "learn-option", text); b.type = "button";
                b.addEventListener("click", async () => {
                    if (answered) return; answered = true;
                    const ok = i === q.payload.answer;
                    b.classList.add(ok ? "right" : "wrong");
                    options.children[q.payload.answer].classList.add("right");
                    note.textContent = (ok ? "Right. " : "Not quite. ") + (q.payload.explain || ""); note.hidden = false;
                    await record(q, ok);
                    const go = el("button", "primary", index + 1 === deck.length ? "Finish" : "Next"); go.type = "button"; go.addEventListener("click", next); card.append(go);
                });
                options.append(b);
            });
            card.append(options, note); box.append(card); return box;
        }

        function match(q) {
            const box = frame(q);
            const card = el("div", "learn-card"); card.append(el("p", "learn-front", "Connect each term with its meaning"));
            const pairs = q.payload.pairs;
            const termOrder = learnShuffle(pairs.map((_, i) => i)), matchOrder = learnShuffle(pairs.map((_, i) => i));
            const grid = el("div", "learn-match");
            const left = el("div"), rightCol = el("div");
            let picked = null, mistakes = 0, solved = 0;
            const buttons = { t: new Map(), m: new Map() };
            const make = (side, i, text) => {
                const b = el("button", "learn-tile", text); b.type = "button"; buttons[side].set(i, b);
                b.addEventListener("click", async () => {
                    if (b.classList.contains("done")) return;
                    if (side === "t") { if (picked !== null) buttons.t.get(picked).classList.remove("picked"); picked = i; b.classList.add("picked"); return; }
                    if (picked === null) return;
                    const t = buttons.t.get(picked);
                    if (learnMatchCorrect(picked, i)) {
                        t.classList.remove("picked"); t.classList.add("done"); b.classList.add("done"); picked = null; solved++;
                        if (solved === pairs.length) { await record(q, mistakes === 0); const go = el("button", "primary", index + 1 === deck.length ? "Finish" : "Next"); go.type = "button"; go.addEventListener("click", next); card.append(go); }
                    } else {
                        mistakes++; b.classList.add("wrong"); setTimeout(() => b.classList.remove("wrong"), 500);
                    }
                });
                return b;
            };
            termOrder.forEach(i => left.append(make("t", i, pairs[i].term)));
            matchOrder.forEach(i => rightCol.append(make("m", i, pairs[i].match)));
            grid.append(left, rightCol); card.append(grid); box.append(card); return box;
        }

        function show() {
            if (index >= deck.length) return finish();
            const q = deck[index];
            const view = q.kind === "match" ? match(q) : q.kind === "choice" ? choice(q) : cover(q);
            stageEl.replaceChildren(view);
            stageEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
        show();
    }

    window.loadExamLearn = load;
    document.querySelector('.nav-button[data-view="briefing"]')?.addEventListener("click", () => load());
    document.getElementById("exam-learn-refresh")?.addEventListener("click", () => load());
})();

/* "Needs your attention" window inside the Briefing view:
   exact steps for every problem the self-check could not solve alone, and a button that lets the AI try again.
   Pure functions are unit-tested in tests/attention-admin.test.mjs. */

const SUPABASE_SECRETS_PATH = "Supabase → your project → Edge Functions → Secrets";

/** What the owner should do about one event. Never contains a secret; only names where to look. */
function attentionGuide(event) {
    const text = `${event?.found || ""} ${event?.action || ""}`.toLowerCase();
    const component = String(event?.component || "");

    if (/missing .*(secret|firebase|google|iserv|supabase_service)|is missing/.test(text) || /service_role_key/.test(text)) {
        const name = (String(event?.found || "").match(/\b[A-Z][A-Z0-9_]{5,}\b/) || [])[0];
        return {
            title: `A required setting is missing${name ? `: ${name}` : ""}`,
            why: "The briefing cannot read it, so that part is skipped. Retrying cannot help until the value exists.",
            steps: [
                `Open ${SUPABASE_SECRETS_PATH}.`,
                name ? `Add or re-enter the secret named ${name}.` : "Add the secret named in the message above.",
                "Press “Let the AI try again” below to confirm it works.",
            ],
            canRetry: false,
        };
    }
    if (component === "request-counts" && /\b40[13]\b/.test(text)) {
        return {
            title: "The briefing was not allowed to count your requests",
            why: "The database refused the key the briefing uses (HTTP 401/403). The request numbers are missing from the briefing.",
            steps: [
                `Open ${SUPABASE_SECRETS_PATH}.`,
                "Check that SUPABASE_SERVICE_ROLE_KEY exists and is the current service role key (Project Settings → API).",
                "If you recently rotated keys, paste the new service role key as that secret.",
                "Press “Let the AI try again” below.",
            ],
            canRetry: true,
        };
    }
    if (component === "google-calendar" && /invalid_grant|token/.test(text)) {
        return {
            title: "Google Calendar no longer lets the briefing in",
            why: "The saved Google login (refresh token) expired or was revoked. Calendar events are missing from the briefing.",
            steps: [
                "Run your google-calendar-auth function again and sign in with Google to get a new refresh token.",
                `Open ${SUPABASE_SECRETS_PATH} and replace GOOGLE_REFRESH_TOKEN with the new value.`,
                "If this keeps happening after about a week, your Google OAuth app is still in “Testing” mode. Publish it in Google Cloud Console → OAuth consent screen.",
                "Press “Let the AI try again” below.",
            ],
            canRetry: true,
        };
    }
    if (component === "firebase-fcm" || /fcm|firebase/.test(text)) {
        return {
            title: "The push notification could not be sent",
            why: "The briefing was built, but your phone was not notified. It is still readable in this window.",
            steps: [
                "If the message mentions HTTP 401/403 or OAuth: re-check FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in " + SUPABASE_SECRETS_PATH + ".",
                "If it mentions 404 or an unknown topic: check FIREBASE_PROJECT_ID.",
                "Otherwise press “Let the AI try again” below; short outages usually pass.",
            ],
            canRetry: true,
        };
    }
    if (component === "webuntis") {
        const empty = /0 lessons/.test(text);
        return {
            title: empty ? "WebUntis returned no lessons" : "WebUntis could not be read",
            why: empty
                ? "On a school day this means either holidays or a broken sync. The timetable shown is the built-in baseline, not live data."
                : "The timetable part of the briefing is missing or may be wrong.",
            steps: [
                empty ? "Check your school calendar: if today is a holiday, nothing is wrong." : "Open the untis-test function logs in Supabase and look for the first error line.",
                "If it is not a holiday, log in to WebUntis yourself to confirm your account still works.",
                "Press “Let the AI try again” below.",
            ],
            canRetry: !empty,
        };
    }
    if (component === "weather" || component === "iserv-exams") {
        return {
            title: component === "weather" ? "The weather service did not answer" : "The exam calendar did not answer",
            why: "This is usually a short outage on their side. The briefing was sent without that part.",
            steps: ["Nothing to change. Press “Let the AI try again” below; if it keeps failing for hours, tell me and I will look."],
            canRetry: true,
        };
    }
    if (component === "ai-review") {
        return {
            title: "The AI reviewer could not be reached",
            why: "Only the second opinion is missing. Safe repairs by the code itself still ran.",
            steps: [
                `If this repeats every day, check OPENROUTER_API_KEY in ${SUPABASE_SECRETS_PATH}.`,
                "Otherwise you can ignore it.",
            ],
            canRetry: true,
        };
    }
    return {
        title: "Something needs a look",
        why: "The self-check could not decide this on its own.",
        steps: [
            "Read the “Found” line above: it is the exact message the system saw.",
            "Open Supabase → Edge Functions → daily-briefing → Logs and look for that message.",
            "If you are unsure, press “Let the AI try again” once, then tell me what it says.",
        ],
        canRetry: true,
    };
}

/** Events of one run that still need the owner: stopped, or reported at medium severity or higher. AI notes are context, not problems. */
function eventsNeedingAttention(events) {
    const rank = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };
    return (events || []).filter(e => e && e.kind !== "ai" && e.component !== "manual-retry" &&
        (e.outcome === "stopped" || (e.outcome === "reported" && (rank[e.severity] ?? 0) >= 2)));
}

/** True when pressing the button can plausibly help (at least one problem is retryable). */
function anyRetryable(events) {
    return eventsNeedingAttention(events).some(e => attentionGuide(e).canRetry);
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { attentionGuide, eventsNeedingAttention, anyRetryable };
}

/* ---------------- browser only ---------------- */

function attentionEl(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function renderAttentionPanel(run, events) {
    const panel = document.getElementById("briefing-attention");
    if (!panel) return;
    panel.replaceChildren();
    const problems = eventsNeedingAttention(events);
    if (!run || !problems.length) { panel.classList.add("hidden"); return; }
    panel.classList.remove("hidden");

    panel.append(attentionEl("h3", "", "Needs your attention"));
    for (const event of problems) {
        const guide = attentionGuide(event);
        const card = attentionEl("div", "attn-item");
        card.append(attentionEl("p", "attn-title", guide.title));
        card.append(attentionEl("p", "attn-why", guide.why));
        const found = attentionEl("p", "attn-found");
        found.append(attentionEl("strong", "", "The system saw: "), document.createTextNode(String(event.found || "")));
        card.append(found);
        const steps = attentionEl("ol", "attn-steps");
        guide.steps.forEach(step => steps.append(attentionEl("li", "", step)));
        card.append(steps);
        panel.append(card);
    }

    const actions = attentionEl("div", "attn-actions");
    const button = attentionEl("button", "primary", "Let the AI try again");
    button.type = "button";
    button.disabled = !anyRetryable(events);
    const note = attentionEl("p", "attn-note",
        button.disabled
            ? "Retrying cannot fix this by itself. Follow the steps above first."
            : "This re-runs the whole briefing now and only notifies your phone again if the text changed or the first push failed. The AI can retry and tidy the text. It never changes keys, passwords or settings.");
    const status = attentionEl("p", "attn-status");
    status.setAttribute("role", "status");
    button.addEventListener("click", () => retryBriefing(button, status));
    actions.append(button, note, status);
    panel.append(actions);
}

async function retryBriefing(button, status) {
    if (!confirm("Re-run the briefing now?\n\nYour phone is only notified again if the text changed or the first push failed.")) return;
    button.disabled = true;
    status.textContent = "Starting…";
    try {
        const before = (await db.from("briefing_runs").select("id").order("id", { ascending: false }).limit(1)).data?.[0]?.id ?? 0;
        const { data, error } = await db.rpc("request_briefing_retry");
        if (error) throw error;
        if (!data?.started) { status.textContent = data?.reason || "Could not start."; return; }
        status.textContent = "Started. Waiting for the new result (up to a minute)…";
        for (let i = 0; i < 20; i++) {
            await new Promise(resolve => setTimeout(resolve, 4000));
            const latest = (await db.from("briefing_runs").select("id, status, summary").order("id", { ascending: false }).limit(1)).data?.[0];
            if (latest && latest.id > before) {
                status.textContent = `Done: ${latest.summary || latest.status}`;
                if (typeof loadBriefing === "function") loadBriefing();
                if (typeof loadHub === "function") loadHub();
                return;
            }
        }
        status.textContent = "Still running or no result yet. Reload this window in a minute.";
    } catch (error) {
        console.error("Manual retry failed:", error);
        status.textContent = `Could not start the retry: ${error?.message || error}`;
    } finally {
        button.disabled = false;
    }
}

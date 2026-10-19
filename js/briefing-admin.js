/* =========================================================
   BRIEFING WINDOW (admin dashboard)
   Shows the latest daily briefing, and what the self-check
   AI found, fixed, or stopped on — with timestamps.
   Reads briefing_runs / briefing_events (owner-only RLS).
========================================================= */

const BRIEFING_TZ = "Europe/Berlin";


/* ---------- pure helpers (unit-tested in /tests) ---------- */

function briefingEscape(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function formatBriefingTime(iso) {

    const date = new Date(iso);

    if (!iso || Number.isNaN(date.getTime())) return "—";

    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: BRIEFING_TZ
    }).format(date);
}


function formatBriefingDateKey(key) {

    if (!/^\d{8}$/.test(String(key ?? ""))) return String(key ?? "—");

    const date = new Date(Date.UTC(
        Number(key.slice(0, 4)),
        Number(key.slice(4, 6)) - 1,
        Number(key.slice(6, 8))
    ));

    return new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC"
    }).format(date);
}


function briefingStatusInfo(status) {

    switch (status) {
        case "healthy":  return { label: "Healthy",  tone: "good" };
        case "repaired": return { label: "Repaired", tone: "info" };
        case "degraded": return { label: "Needs a look", tone: "warn" };
        case "failed":   return { label: "Failed",   tone: "bad" };
        default:         return { label: "Unknown",  tone: "muted" };
    }
}


function briefingOutcomeInfo(outcome) {

    switch (outcome) {
        case "fixed":    return { label: "Fixed automatically", tone: "info" };
        case "stopped":  return { label: "Stopped — needs you", tone: "bad" };
        case "reported": return { label: "Reported",            tone: "warn" };
        case "ok":       return { label: "OK",                  tone: "good" };
        default:         return { label: "Unknown",             tone: "muted" };
    }
}


function briefingKindLabel(kind) {

    switch (kind) {
        case "repair":     return "Repair";
        case "ai":         return "AI review";
        case "escalation": return "Escalation";
        default:           return "Check";
    }
}


function renderBriefingEvent(event) {

    const outcome = briefingOutcomeInfo(event.outcome);

    return `
        <li class="bf-event bf-${outcome.tone}">

            <div class="bf-event-head">

                <span class="bf-badge bf-${outcome.tone}">
                    ${briefingEscape(outcome.label)}
                </span>

                <span class="bf-kind">
                    ${briefingEscape(briefingKindLabel(event.kind))}
                    · ${briefingEscape(event.component)}
                </span>

                <time class="bf-time">
                    ${briefingEscape(formatBriefingTime(event.created_at))}
                </time>

            </div>

            <p class="bf-found">
                <strong>Found:</strong>
                ${briefingEscape(event.found)}
            </p>

            <p class="bf-action">
                <strong>${event.outcome === "fixed" ? "Changed" : "Did"}:</strong>
                ${briefingEscape(event.action)}
            </p>

        </li>
    `;
}


function renderBriefingRun(run, events) {

    if (!run) {
        return '<p class="empty">No briefing has been recorded yet. The first one appears after the next scheduled run (Mon–Fri).</p>';
    }

    const status = briefingStatusInfo(run.status);

    const fixed = events.filter(e => e.outcome === "fixed").length;
    const stopped = events.filter(e => e.outcome === "stopped").length;
    const reported = events.filter(e => e.outcome === "reported" && e.kind !== "ai").length;

    const components = Array.isArray(run.components) ? run.components : [];

    const componentRows = components.map(c => `
        <tr>
            <td>${briefingEscape(c.name)}</td>
            <td>${c.success ? "OK" : "Failed"}</td>
            <td>${briefingEscape(c.attempts ?? 1)}</td>
            <td>${briefingEscape(c.error || (c.recovered ? "Recovered after retry" : ""))}</td>
        </tr>
    `).join("");

    const eventList = events.length === 0
        ? '<p class="empty">The self-check found nothing to fix or report for this run.</p>'
        : `<ul class="bf-events">${events.map(renderBriefingEvent).join("")}</ul>`;

    return `
        <div class="bf-run-head">

            <div>
                <h3>${briefingEscape(formatBriefingDateKey(run.date_key))}</h3>
                <p class="bf-sub">
                    Ran ${briefingEscape(formatBriefingTime(run.run_at))}
                    · Push ${run.push_sent ? "sent" : "NOT sent"}
                </p>
            </div>

            <span class="bf-badge bf-${status.tone}">
                ${briefingEscape(status.label)}
            </span>

        </div>

        <p class="bf-summary">${briefingEscape(run.summary || "")}</p>

        <div class="stats-grid">
            <div class="stat-card"><div class="stat-label">Fixed automatically</div><div class="stat-value">${fixed}</div></div>
            <div class="stat-card"><div class="stat-label">Stopped for you</div><div class="stat-value">${stopped}</div></div>
            <div class="stat-card"><div class="stat-label">Reported</div><div class="stat-value">${reported}</div></div>
        </div>

        <h4 class="bf-h">Briefing as sent</h4>
        <pre class="bf-text">${briefingEscape(run.briefing || "(empty)")}</pre>

        <h4 class="bf-h">Self-check &amp; AI activity</h4>
        ${eventList}

        <h4 class="bf-h">Data sources</h4>
        <div class="bf-table-wrap">
            <table class="bf-table">
                <thead><tr><th>Source</th><th>Result</th><th>Attempts</th><th>Note</th></tr></thead>
                <tbody>${componentRows}</tbody>
            </table>
        </div>
    `;
}


function groupBriefingEvents(events) {

    const byRun = new Map();

    for (const event of events || []) {
        if (!byRun.has(event.run_id)) byRun.set(event.run_id, []);
        byRun.get(event.run_id).push(event);
    }

    for (const list of byRun.values()) {
        list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }

    return byRun;
}


/* ---------- dashboard wiring ---------- */

let briefingRuns = [];
let briefingEventsByRun = new Map();


function showBriefingRun(runId) {

    const target = document.getElementById("briefing-detail");

    if (!target) return;

    const run = briefingRuns.find(r => String(r.id) === String(runId)) || null;

    target.innerHTML = renderBriefingRun(run, briefingEventsByRun.get(run?.id) || []);
}


async function loadBriefingInner() {

    const detail = document.getElementById("briefing-detail");
    const picker = document.getElementById("briefing-run-picker");

    if (!detail || typeof db === "undefined") return;

    detail.innerHTML = '<p class="empty">Loading briefing...</p>';

    const { data: runs, error: runError } = await db
        .from("briefing_runs")
        .select("*")
        .order("run_at", { ascending: false })
        .limit(14);

    if (runError) {

        console.error("Could not load briefing runs:", runError);

        detail.innerHTML =
            '<p class="empty">Could not load the briefing: ' +
            briefingEscape(runError.message || runError) + '</p>';

        return;
    }

    briefingRuns = runs || [];

    let events = [];

    if (briefingRuns.length > 0) {

        const { data, error } = await db
            .from("briefing_events")
            .select("*")
            .in("run_id", briefingRuns.map(r => r.id))
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Could not load briefing events:", error);
        } else {
            events = data || [];
        }
    }

    briefingEventsByRun = groupBriefingEvents(events);

    if (picker) {

        picker.innerHTML = briefingRuns.map(run => `
            <option value="${briefingEscape(run.id)}">
                ${briefingEscape(formatBriefingTime(run.run_at))}
                — ${briefingEscape(briefingStatusInfo(run.status).label)}
            </option>
        `).join("");

        picker.onchange = () => showBriefingRun(picker.value);
    }

    showBriefingRun(briefingRuns[0]?.id);
}


/* Never leave the window on "Loading": show the real error, or a timeout message, instead. */
async function loadBriefing() {

    const detail = document.getElementById("briefing-detail");

    try {

        await Promise.race([
            loadBriefingInner(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("the database did not answer within 20 seconds")), 20000)),
        ]);

    } catch (error) {

        console.error("Could not load the briefing:", error);

        if (detail) {
            detail.innerHTML = '<p class="empty">Could not load the briefing: ' +
                briefingEscape(error?.message || error) + '</p>';
        }
    }
}


if (typeof module !== "undefined" && module.exports) {

    module.exports = {
        briefingEscape,
        formatBriefingTime,
        formatBriefingDateKey,
        briefingStatusInfo,
        briefingOutcomeInfo,
        briefingKindLabel,
        renderBriefingEvent,
        renderBriefingRun,
        groupBriefingEvents
    };
}

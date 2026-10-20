/* Admin hub helpers: needs-attention list, briefing health, nav badges, CSV export, safe URLs.
   Pure functions are unit-tested in tests/hub-admin.test.mjs; the loader at the bottom only runs in the browser. */

const HUB_STALE_REQUEST_DAYS = 2;
const HUB_BRIEFING_STALE_HOURS = 26;

/** Only http(s) links from customers are clickable. javascript:, data:, etc. become "". */
function safeUrl(value, base) {
    if (!String(value ?? "").trim()) return "";
    try {
        const url = new URL(String(value || ""), base || (typeof location !== "undefined" ? location.href : "https://example.com/"));
        return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
    } catch {
        return "";
    }
}

/** One CSV cell, safe against spreadsheet formula injection (=, +, -, @) and with ; as separator. */
function csvCell(value) {
    let text = String(value ?? "");
    if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
    return /[";\n\r]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

function requestsToCsv(requests, payments) {
    const priceById = new Map();
    for (const payment of payments || []) {
        const amount = Number(payment?.amount);
        if (Number.isFinite(amount)) priceById.set(String(payment.request_id), amount);
    }
    const header = ["Code", "Date", "Name", "Email", "Discord", "Type", "Size", "Status", "Price (EUR)"];
    const rows = (requests || []).map(request => [
        request.request_code || `KXD-${String(request.id).padStart(4, "0")}`,
        request.created_at ? new Date(request.created_at).toISOString().slice(0, 10) : "",
        request.name, request.email, request.discord, request.type, request.size,
        request.status || "Pending",
        priceById.has(String(request.id)) ? priceById.get(String(request.id)).toFixed(2).replace(".", ",") : "",
    ]);
    return "﻿" + [header, ...rows].map(row => row.map(csvCell).join(";")).join("\r\n") + "\r\n";
}

const hubDaysBetween = (from, to) => (to - Date.parse(from)) / 86400000;

/** Items for the Overview card. tone: "bad" | "warn" | "good". */
function needsAttention({ requests, questions, latestRun, now }) {
    const items = [];
    const pending = (requests || []).filter(r => (r.status || "Pending") === "Pending");
    if (pending.length) {
        const stale = pending.filter(r => r.created_at && hubDaysBetween(r.created_at, now) >= HUB_STALE_REQUEST_DAYS);
        items.push({
            tone: stale.length ? "bad" : "warn", view: "requests",
            text: `${pending.length} pending request${pending.length === 1 ? "" : "s"}` +
                (stale.length ? `, ${stale.length} waiting more than ${HUB_STALE_REQUEST_DAYS} days` : ""),
        });
    }
    const open = (questions || []).filter(q => (q.status || "Pending") === "Pending");
    if (open.length) items.push({ tone: "warn", view: "questions", text: `${open.length} unanswered question${open.length === 1 ? "" : "s"}` });

    if (!latestRun) {
        items.push({ tone: "warn", view: "briefing", text: "No briefing has been recorded yet." });
    } else {
        const hours = (now - Date.parse(latestRun.run_at)) / 3600000;
        if (hours > HUB_BRIEFING_STALE_HOURS) {
            items.push({ tone: "bad", view: "briefing", text: `The last briefing ran ${Math.floor(hours)} hours ago. It may have stopped.` });
        } else if (latestRun.status === "failed" || latestRun.status === "degraded") {
            items.push({ tone: "bad", view: "briefing", text: `The latest briefing needs a look (${latestRun.status}).` });
        } else {
            items.push({ tone: "good", view: "briefing", text: `The latest briefing is ${latestRun.status}.` });
        }
    }
    return items;
}

/** Counts for the sidebar badges. */
function navBadgeCounts(requests, questions) {
    return {
        requests: (requests || []).filter(r => (r.status || "Pending") === "Pending").length,
        questions: (questions || []).filter(q => (q.status || "Pending") === "Pending").length,
    };
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { safeUrl, csvCell, requestsToCsv, needsAttention, navBadgeCounts };
}

/* ---------------- browser only ---------------- */

async function loadHubInner() {
    const [requests, questions, runs] = await Promise.all([
        db.from("requests").select("id, status, created_at"),
        db.from("questions").select("id, status, created_at"),
        db.from("briefing_runs").select("run_at, status").order("run_at", { ascending: false }).limit(1),
    ]);
    // a failing query must not hide the others: use what we got
    const items = needsAttention({
        requests: requests.error ? [] : requests.data,
        questions: questions.error ? [] : questions.data,
        latestRun: runs.error ? undefined : (runs.data || [])[0],
        now: Date.now(),
    });
    const list = document.getElementById("hub-attention-list");
    if (list) {
        list.replaceChildren(...items.map(item => {
            const row = document.createElement("div");
            row.className = `hub-row hub-${item.tone}`;
            const text = document.createElement("span");
            text.textContent = item.text;
            const open = document.createElement("button");
            open.type = "button"; open.className = "hub-open"; open.textContent = "Open";
            open.addEventListener("click", () => showAdminView(item.view));
            row.append(text, open);
            return row;
        }));
    }
    const counts = navBadgeCounts(requests.error ? [] : requests.data, questions.error ? [] : questions.data);
    for (const [view, count] of Object.entries(counts)) {
        const button = document.querySelector(`.nav-button[data-view="${view}"]`);
        if (!button) continue;
        button.querySelector(".nav-badge")?.remove();
        if (count > 0) {
            const badge = document.createElement("span");
            badge.className = "nav-badge"; badge.textContent = String(count);
            badge.title = `${count} pending`;
            button.append(badge);
        }
    }
}

async function loadHub() {
    const list = document.getElementById("hub-attention-list");
    try {
        await Promise.race([loadHubInner(), new Promise((_, reject) => setTimeout(() => reject(new Error("the database did not answer within 20 seconds")), 20000))]);
    } catch (error) {
        console.error("Could not load the hub:", error);
        if (list) list.textContent = `Could not load this: ${error?.message || error}`;
    }
}

function exportRequestsCsv() {
    const csv = requestsToCsv(typeof adminRequests !== "undefined" ? adminRequests : [], typeof adminPayments !== "undefined" ? adminPayments : []);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = `requests-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

if (typeof document !== "undefined") {
    document.getElementById("export-requests")?.addEventListener("click", exportRequestsCsv);
    document.querySelector('.nav-button[data-view="overview"]')?.addEventListener("click", () => loadHub());
}

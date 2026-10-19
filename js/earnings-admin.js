/* Earnings helpers for the admin Requests window (pure functions, unit-tested in tests/earnings-admin.test.mjs). */

const EARNING_STATUSES_PAID = ["Completed"];
const EARNING_STATUSES_OPEN = ["Pending", "Accepted", "In Progress"];

/** "12,50" / "12.5" / " 12 " -> 12.5. Empty -> null. Invalid or negative -> undefined. */
function parsePrice(input) {
    const text = String(input ?? "").trim().replace(/\s|€/g, "");
    if (text === "") return null;
    let normalised = text;
    if (text.includes(",") && text.includes(".")) {
        // the last separator is the decimal one: 1.234,50 or 1,234.50
        normalised = text.lastIndexOf(",") > text.lastIndexOf(".")
            ? text.replace(/\./g, "").replace(",", ".")
            : text.replace(/,/g, "");
    } else if (text.includes(",")) {
        normalised = text.replace(",", ".");
    }
    if (!/^\d+(\.\d{1,2})?$/.test(normalised)) return undefined;
    const value = Number(normalised);
    return Number.isFinite(value) && value >= 0 && value <= 99999999.99 ? value : undefined;
}

function formatMoney(value) {
    const number = Number(value);
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(Number.isFinite(number) ? number : 0);
}

/** requests: [{id, status}], payments: [{request_id, amount}] -> totals shown in the banner. */
function summarizeEarnings(requests, payments) {
    const amountById = new Map();
    for (const payment of payments || []) {
        const amount = Number(payment?.amount);
        if (Number.isFinite(amount)) amountById.set(String(payment.request_id), amount);
    }
    let earned = 0, open = 0, paidCount = 0, completedWithoutPrice = 0;
    // work in cents so 0.1 + 0.2 never shows as 0.30000000000000004
    for (const request of requests || []) {
        const amount = amountById.get(String(request.id));
        if (EARNING_STATUSES_PAID.includes(request.status)) {
            if (amount === undefined) completedWithoutPrice++;
            else { earned += Math.round(amount * 100); paidCount++; }
        } else if (EARNING_STATUSES_OPEN.includes(request.status) && amount !== undefined) {
            open += Math.round(amount * 100);
        }
    }
    return { earned: earned / 100, open: open / 100, paidCount, completedWithoutPrice };
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { parsePrice, formatMoney, summarizeEarnings };
}

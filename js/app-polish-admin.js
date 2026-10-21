/* Small app-polish helpers: the date line on Home and the status chips on Requests. Browser only, cosmetic. */
(function () {
    if (typeof document === "undefined") return;

    const dateLine = document.getElementById("home-date");
    const setDate = () => {
        if (!dateLine) return;
        dateLine.textContent = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Berlin" }).format(new Date());
    };
    setDate();
    document.addEventListener("visibilitychange", () => { if (!document.hidden) setDate(); }); // the app can stay open past midnight

    // The chips drive the existing (now hidden) status select, so requests-admin.js needs no changes.
    const select = document.getElementById("filter");
    const chips = Array.from(document.querySelectorAll("#request-chips .chip"));
    const paint = () => chips.forEach((chip) => {
        const on = chip.dataset.filter === (select?.value || "all");
        chip.classList.toggle("active", on);
        chip.setAttribute("aria-pressed", String(on));
    });
    chips.forEach((chip) => chip.addEventListener("click", () => {
        if (!select) return;
        select.value = chip.dataset.filter;
        select.dispatchEvent(new Event("change"));
        paint();
    }));
    select?.addEventListener("change", paint);
})();

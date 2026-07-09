/* ============================================================
   RENDERING LOGIC
   You shouldn't need to edit this file to update content —
   edit config.js instead. This file just wires SITE_CONFIG
   into the page and handles the interactive bits.
   ============================================================ */

const LEVER_COLORS = {
  stop:    { css: "var(--lever-stop)",    label: "Stop signal" },
  distant: { css: "var(--lever-distant)", label: "Distant signal" },
  points:  { css: "var(--lever-points)",  label: "Points" },
  fpl:     { css: "var(--lever-fpl)",     label: "Facing point lock" },
  gate:    { css: "var(--lever-gate)",    label: "Gate" },
  spare:   { css: "var(--lever-spare)",   label: "Spare" },
};

const LEVER_KEYS = ["stop", "distant", "points", "fpl", "gate", "spare"];

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

function escapeHTML(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function renderText(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

/* ---------- Nav + hero ---------- */
function renderBrand(cfg) {
  document.title = `${cfg.site.title} — ${cfg.site.tagline}`;
  renderText("nav-title", cfg.site.title);
  renderText("nav-tagline", cfg.site.tagline);
  renderText("hero-eyebrow", cfg.hero.eyebrow);
  renderText("hero-headline", cfg.hero.headline);
  renderText("hero-subheadline", cfg.hero.subheadline);
}

/* ---------- Lever bank (the interactive signature element) ---------- */
function renderLeverBank() {
  const bank = document.getElementById("lever-bank");
  const count = 12;
  for (let i = 0; i < count; i++) {
    const key = LEVER_KEYS[i % LEVER_KEYS.length];
    const color = LEVER_COLORS[key];

    const unit = el("div", "lever-unit");

    const slot = el("div", "lever-slot");
    slot.setAttribute("role", "button");
    slot.setAttribute("tabindex", "0");
    slot.setAttribute("aria-pressed", "false");
    slot.setAttribute("aria-label", `Lever ${i + 1}, ${color.label}, normal`);

    const handle = el("div", "lever-handle");
    handle.style.background = color.css;
    slot.appendChild(handle);

    const number = el("div", "lever-number", String(i + 1));
    const state = el("div", "lever-state", "Normal");

    function toggle() {
      const reversed = slot.classList.toggle("reversed");
      state.textContent = reversed ? "Reverse" : "Normal";
      slot.setAttribute("aria-pressed", String(reversed));
      slot.setAttribute("aria-label", `Lever ${i + 1}, ${color.label}, ${reversed ? "reverse" : "normal"}`);
    }

    slot.addEventListener("click", toggle);
    slot.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });

    unit.appendChild(slot);
    unit.appendChild(number);
    unit.appendChild(state);
    bank.appendChild(unit);
  }
}

/* ---------- About ---------- */
function renderAbout(cfg) {
  const body = document.getElementById("about-body");
  cfg.about.body.split("\n\n").forEach((para) => {
    body.appendChild(el("p", null, escapeHTML(para)));
  });

  const stats = document.getElementById("about-stats");
  (cfg.about.stats || []).forEach((s) => {
    const stat = el("div", "stat");
    stat.appendChild(el("span", "value", escapeHTML(s.value)));
    stat.appendChild(el("span", "label", escapeHTML(s.label)));
    stats.appendChild(stat);
  });
}

/* ---------- Legend ---------- */
function renderLegend() {
  const legend = document.getElementById("legend");
  LEVER_KEYS.forEach((key) => {
    const color = LEVER_COLORS[key];
    const item = el("div", "legend-item");
    const swatch = el("span", "legend-swatch");
    swatch.style.background = color.css;
    item.appendChild(swatch);
    item.appendChild(document.createTextNode(color.label));
    legend.appendChild(item);
  });
}

/* ---------- Examples ---------- */
function renderExamples(cfg) {
  renderText("examples-heading", cfg.examples.heading);
  renderText("examples-intro", cfg.examples.intro);

  const grid = document.getElementById("examples-grid");
  cfg.examples.items.forEach((item) => {
    const color = LEVER_COLORS[item.swatch] || LEVER_COLORS.spare;
    const card = el("div", "example-card");

    const bar = el("div", "example-card-bar");
    bar.style.background = color.css;
    card.appendChild(bar);

    const body = el("div", "example-card-body");
    const top = el("div", "example-card-top");
    top.appendChild(el("h3", null, escapeHTML(item.title)));
    top.appendChild(el("span", "example-tag", escapeHTML(item.tag)));
    body.appendChild(top);
    body.appendChild(el("p", null, escapeHTML(item.description)));
    card.appendChild(body);

    grid.appendChild(card);
  });
}

/* ---------- Reviews ---------- */
function renderReviews(cfg) {
  renderText("reviews-heading", cfg.reviews.heading);
  renderText("reviews-intro", cfg.reviews.intro);

  const list = document.getElementById("reviews-list");
  cfg.reviews.items.forEach((r, i) => {
    const row = el("div", "review-row");
    row.appendChild(el("div", "review-index", String(i + 1).padStart(2, "0")));
    row.appendChild(el("p", "review-quote", escapeHTML(r.quote)));

    const attr = el("div", "review-attr");
    attr.appendChild(el("span", "name", escapeHTML(r.name)));
    attr.appendChild(el("span", "context", escapeHTML(r.context)));
    row.appendChild(attr);

    list.appendChild(row);
  });
}

/* ---------- Terms ---------- */
function renderTerms(cfg) {
  renderText("terms-heading", cfg.terms.heading);
  renderText("terms-intro", cfg.terms.intro);

  const list = document.getElementById("terms-list");
  cfg.terms.clauses.forEach(() => {}); // no-op, kept for symmetry
  cfg.terms.clauses.forEach((c) => {
    const clause = el("div", "term-clause");
    clause.appendChild(el("div", "term-clause-number"));
    const content = el("div");
    content.appendChild(el("h3", null, escapeHTML(c.title)));
    content.appendChild(el("p", null, escapeHTML(c.body)));
    clause.appendChild(content);
    list.appendChild(clause);
  });
}

/* ---------- Footer ---------- */
function renderFooter(cfg) {
  renderText("footer-heading", cfg.footer.heading);
  renderText("footer-body", cfg.footer.body);
  renderText("footer-colophon", cfg.footer.colophon);
  renderText("footer-year", `© ${new Date().getFullYear()}`);

  const links = document.getElementById("footer-links");
  (cfg.footer.links || []).forEach((link) => {
    const li = el("li");
    const a = el("a", null, escapeHTML(link.label));
    a.href = link.url;
    li.appendChild(a);
    links.appendChild(li);
  });
}

/* ---------- Nav scroll ---------- */
function wireNav() {
  document.querySelectorAll("[data-scroll]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.scroll);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

/* ---------- Boot ---------- */
(function init() {
  const cfg = window.SITE_CONFIG;
  renderBrand(cfg);
  renderLeverBank();
  renderAbout(cfg);
  renderLegend();
  renderExamples(cfg);
  renderReviews(cfg);
  renderTerms(cfg);
  renderFooter(cfg);
  wireNav();
})();

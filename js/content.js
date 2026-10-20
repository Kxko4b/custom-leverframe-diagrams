// Read the same `content` rows used by the admin content editor.
async function trackVisit() {
  const { error } = await db.from("page_views").insert([
    { page: window.location.pathname },
  ]);

  if (error) {
    console.error("View tracking error:", error);
  }
}

/* The about/terms boxes start as skeleton lines. They get the saved text, or the built-in fallback if there is none. */
function settleContent(id, html) {
  const target = document.getElementById(id);
  if (!target) return;
  target.removeAttribute("aria-busy");
  if (html !== null) {
    target.innerHTML = html;
    target.classList.add("database-copy", "formatted-copy");
  } else {
    target.textContent = target.dataset.fallback || "";
  }
}

async function loadContent() {
  const targets = { about: "about-text", terms: "terms-text" };
  const filled = new Set();
  try {
    const { data, error } = await db.from("site_content").select("section, content");
    if (error) throw error;
    for (const item of data || []) {
      const id = targets[item.section];
      if (id && typeof item.content === "string" && item.content.trim()) {
        settleContent(id, window.renderSiteMarkdown(item.content.trim()));
        filled.add(id);
      }
    }
  } catch (error) {
    console.error("Could not load site content:", error);
  }
  for (const id of Object.values(targets)) if (!filled.has(id)) settleContent(id, null);
}

trackVisit();
loadContent();

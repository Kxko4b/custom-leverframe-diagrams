// Read the same `content` rows used by the admin content editor.
async function trackVisit() {
  const { error } = await db.from("page_views").insert([
    { page: window.location.pathname },
  ]);

  if (error) {
    console.error("View tracking error:", error);
  }
}

async function loadContent() {
  const targets = { about: "about-text", terms: "terms-text" };
  const { data, error } = await db.from("site_content").select("section, content");

  if (error) {
    console.error("Could not load site content:", error);
    return;
  }

  for (const item of data || []) {
    const target = document.getElementById(targets[item.section]);
    if (target && typeof item.content === "string" && item.content.trim()) {
      target.innerHTML = window.renderSiteMarkdown(item.content.trim());
      target.classList.add("database-copy", "formatted-copy");
    }
  }
}

trackVisit();
loadContent();

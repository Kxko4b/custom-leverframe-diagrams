const SITE_COPY_FIELDS = ["about", "terms"];

async function loadSiteContentAdmin() {
  const message = document.getElementById("content-message");
  const { data, error } = await db.from("site_content").select("section, content");
  if (error) {
    console.error("Could not load website copy:", error);
    message.textContent = "Could not load website copy.";
    return;
  }

  for (const item of data || []) {
    if (SITE_COPY_FIELDS.includes(item.section)) {
      document.getElementById(`content-${item.section}`).value = item.content || "";
    }
  }
  message.textContent = "Website copy loaded.";
}

document.getElementById("content-save")?.addEventListener("click", async (event) => {
  const button = event.currentTarget;
  const message = document.getElementById("content-message");
  button.disabled = true;
  message.textContent = "Saving…";

  for (const section of SITE_COPY_FIELDS) {
    const value = document.getElementById(`content-${section}`).value.trim();
    const { data, error: lookupError } = await db
      .from("site_content")
      .select("section")
      .eq("section", section)
      .maybeSingle();

    if (lookupError) {
      console.error("Could not find website copy row:", lookupError);
      message.textContent = "Could not save website copy. Please try again.";
      button.disabled = false;
      return;
    }

    const result = data
      ? await db.from("site_content").update({ content: value }).eq("section", section)
      : await db.from("site_content").insert({ section, content: value });

    if (result.error) {
      console.error("Could not save website copy:", result.error);
      message.textContent = "Could not save website copy. Please try again.";
      button.disabled = false;
      return;
    }
  }

  button.disabled = false;
  message.textContent = "Website copy saved.";
});

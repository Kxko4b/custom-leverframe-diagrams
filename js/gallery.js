async function loadGallery() {
  const gallery = document.getElementById("gallery");
  if (!gallery) return;

  const { data, error } = await db
    .from("examples")
    .select("title, description, image_url, created_at")
    .order("created_at", { ascending: false });

  gallery.replaceChildren();
  if (error) {
    console.error("Could not load examples:", error);
    gallery.append(makeGalleryMessage("Examples are unavailable right now."));
    return;
  }
  if (!data?.length) {
    gallery.append(makeGalleryMessage("Examples will appear here soon."));
    return;
  }

  for (const example of data) {
    const card = document.createElement("article");
    card.className = "card example-card";

    if (example.image_url) {
      const image = document.createElement("img");
      image.src = example.image_url;
      image.alt = example.title ? `${example.title} diagram` : "Leverframe diagram example";
      image.loading = "lazy";
      image.addEventListener("error", () => image.remove(), { once: true });
      card.append(image);
    }

    const title = document.createElement("h3");
    title.textContent = example.title || "Custom diagram";
    card.append(title);

    if (example.description) {
      const description = document.createElement("p");
      description.className = "muted small";
      description.textContent = example.description;
      card.append(description);
    }
    gallery.append(card);
  }
}

function makeGalleryMessage(text) {
  const message = document.createElement("p");
  message.className = "muted small gallery-message";
  message.textContent = text;
  return message;
}

loadGallery();

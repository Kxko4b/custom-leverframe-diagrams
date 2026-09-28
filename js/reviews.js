// Public review display and submission use the `message` field edited in admin.
async function loadReviews() {
  const box = document.getElementById("review-list");
  if (!box) return;
  box.textContent = "Loading reviews…";

  const { data, error } = await db
    .from("reviews")
    .select("name, rating, message, image_url, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Could not load reviews:", error);
    box.textContent = "Reviews are unavailable right now.";
    return;
  }

  box.replaceChildren();
  if (!data?.length) {
    box.textContent = "No reviews yet.";
    return;
  }

  for (const review of data) {
    const card = document.createElement("article");
    card.className = "card review";
    const stars = document.createElement("div");
    stars.className = "stars";
    const rating = Math.max(0, Math.min(5, Number(review.rating) || 0));
    stars.textContent = "★".repeat(rating) + "☆".repeat(5 - rating);
    const message = document.createElement("p");
    message.textContent = `“${review.message || ""}”`;
    if (review.image_url) {
      const image = document.createElement("img");
      image.className = "review-image";
      image.src = review.image_url;
      image.alt = `Photo shared with ${review.name || "Anonymous"}'s review`;
      image.loading = "lazy";
      image.addEventListener("error", () => image.remove(), { once: true });
      card.append(image);
    }
    const name = document.createElement("strong");
    name.textContent = `— ${review.name || "Anonymous"}`;
    card.append(stars, message, name);
    box.append(card);
  }
}

let reviewRating = 0;
const starsWrap = document.getElementById("review-stars");
starsWrap?.querySelectorAll("button").forEach((button) => {
  button.addEventListener("click", () => {
    reviewRating = Number(button.dataset.value) || 0;
    starsWrap.querySelectorAll("button").forEach((star) => {
      star.classList.toggle("on", Number(star.dataset.value) <= reviewRating);
      star.setAttribute("aria-pressed", String(Number(star.dataset.value) === reviewRating));
    });
  });
});

document.getElementById("review-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const msg = document.getElementById("review-msg");
  const button = form.querySelector('[type="submit"]');
  const showMessage = (text, isError = false) => {
    msg.textContent = text;
    msg.classList.remove("hidden", "error", "moss");
    msg.classList.add(isError ? "error" : "moss");
  };

  if (!reviewRating) {
    showMessage("Choose a star rating first.", true);
    return;
  }

  const imageFile = document.getElementById("review-image").files[0];
  if (imageFile && (!imageFile.type.startsWith("image/") || imageFile.size > 5 * 1024 * 1024)) {
    showMessage("Choose a PNG, JPEG, or WebP image smaller than 5 MB.", true);
    return;
  }

  button.disabled = true;
  let imageUrl = null;

  if (imageFile) {
    const extension = imageFile.name.split(".").pop().toLowerCase();
    const path = `${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await db.storage
      .from("review-images")
      .upload(path, imageFile, { contentType: imageFile.type });

    if (uploadError) {
      console.error("Could not upload review image:", uploadError);
      button.disabled = false;
      showMessage("Could not upload the photo. Please try again.", true);
      return;
    }

    imageUrl = db.storage.from("review-images").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await db.from("reviews").insert({
    name: document.getElementById("review-name").value.trim().slice(0, 60),
    rating: reviewRating,
    message: document.getElementById("review-text").value.trim().slice(0, 500),
    image_url: imageUrl,
  });
  button.disabled = false;

  if (error) {
    console.error("Could not submit review:", error);
    showMessage("Could not submit your review. Please try again.", true);
    return;
  }

  form.reset();
  reviewRating = 0;
  starsWrap?.querySelectorAll("button").forEach((star) => {
    star.classList.remove("on");
    star.setAttribute("aria-pressed", "false");
  });
  showMessage("Thanks! Your review has been sent.");
  await loadReviews();
});

loadReviews();

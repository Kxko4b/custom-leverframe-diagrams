// Public review display and submission use the `message` field edited in admin.

const REVIEW_MAX_BYTES = 25 * 1024 * 1024; // must match the review-images bucket limit
const REVIEW_UPLOAD_TIMEOUT_MS = 120000;
const REVIEW_FILE_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

function isVideoUrl(url) {
  try {
    return /\.(mp4|webm|mov|m4v)$/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function buildReviewMedia(url, name) {
  if (isVideoUrl(url)) {
    const video = document.createElement("video");
    video.className = "review-image";
    video.src = url;
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.setAttribute("aria-label", `Video shared with ${name}'s review`);
    video.addEventListener(
      "error",
      () => {
        // Some browsers can't play every format (e.g. iPhone .mov in Chrome).
        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Open video";
        video.replaceWith(link);
      },
      { once: true }
    );
    return video;
  }

  const image = document.createElement("img");
  image.className = "review-image";
  image.src = url;
  image.alt = `Photo shared with ${name}'s review`;
  image.loading = "lazy";
  image.addEventListener("error", () => image.remove(), { once: true });
  return image;
}

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
      card.append(buildReviewMedia(review.image_url, review.name || "Anonymous"));
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

  const file = document.getElementById("review-image").files[0];
  if (file) {
    if (!REVIEW_FILE_TYPES[file.type]) {
      showMessage("Choose a PNG, JPEG, WebP, GIF, MP4, WebM, or MOV file.", true);
      return;
    }
    if (file.size > REVIEW_MAX_BYTES) {
      showMessage("That file is too large. The limit is 25 MB.", true);
      return;
    }
  }

  button.disabled = true;

  try {
    let mediaUrl = null;

    if (file) {
      showMessage(
        file.type.startsWith("video/")
          ? "Uploading video… this can take a moment."
          : "Uploading…"
      );
      const path = `${crypto.randomUUID()}.${REVIEW_FILE_TYPES[file.type]}`;
      const { error: uploadError } = await withTimeout(
        db.storage.from("review-images").upload(path, file, { contentType: file.type }),
        REVIEW_UPLOAD_TIMEOUT_MS,
        "Upload timed out"
      );

      if (uploadError) throw uploadError;
      mediaUrl = db.storage.from("review-images").getPublicUrl(path).data.publicUrl;
    }

    const { error } = await db.from("reviews").insert({
      name: document.getElementById("review-name").value.trim().slice(0, 60),
      rating: reviewRating,
      message: document.getElementById("review-text").value.trim().slice(0, 500),
      image_url: mediaUrl,
    });
    if (error) throw error;

    form.reset();
    reviewRating = 0;
    starsWrap?.querySelectorAll("button").forEach((star) => {
      star.classList.remove("on");
      star.setAttribute("aria-pressed", "false");
    });
    showMessage("Thanks! Your review has been sent.");
    await loadReviews();
  } catch (err) {
    console.error("Could not submit review:", err);
    showMessage(
      file
        ? "Could not upload your file or submit the review. Try a smaller file or try again."
        : "Could not submit your review. Please try again.",
      true
    );
  } finally {
    button.disabled = false;
  }
});

loadReviews();

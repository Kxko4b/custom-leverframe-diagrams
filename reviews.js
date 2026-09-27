// Kxko — reviews: load approved ones, submit new ones
async function loadReviews() {
  const box = document.getElementById("review-list");
  if (!box) return;
  box.textContent = "Loading reviews…";

  const { data, error } = await db
    .from("reviews")
    .select("name, rating, text, created_at")
    .eq("approved", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Could not load reviews:", error);
    box.textContent = "Reviews are unavailable right now.";
    return;
  }

  box.replaceChildren();
  if (!data || data.length === 0) {
    box.textContent = "No reviews yet.";
    return;
  }

  data.forEach((review) => {
    const card = document.createElement("article");
    card.className = "review";

    const stars = document.createElement("div");
    stars.className = "stars";
    const rating = Math.max(0, Math.min(5, Number(review.rating) || 0));
    stars.textContent = "★".repeat(rating) + "☆".repeat(5 - rating);

    const message = document.createElement("p");
    message.textContent = `“${review.text || ""}”`;

    const name = document.createElement("strong");
    name.textContent = `— ${review.name || "Anonymous"}`;

    card.append(stars, message, name);
    box.append(card);
  });
}

let reviewRating = 0;

function setupReviewStars() {
  const wrap = document.getElementById("review-stars");
  if (!wrap) return;
  wrap.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      reviewRating = Number(btn.dataset.value) || 0;
      wrap.querySelectorAll("button").forEach((b) => {
        b.classList.toggle("on", Number(b.dataset.value) <= reviewRating);
      });
    });
  });
}

async function submitReview(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const msg = document.getElementById("review-msg");
  const show = (text) => {
    msg.textContent = text;
    msg.classList.remove("hidden");
  };

  if (!reviewRating) {
    show("Pick a star rating first.");
    return;
  }

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  const { error } = await db.from("reviews").insert({
    name: document.getElementById("review-name").value.trim().slice(0, 60),
    rating: reviewRating,
    text: document.getElementById("review-text").value.trim().slice(0, 500),
  });
  button.disabled = false;

  if (error) {
    console.error("Could not submit review:", error);
    show("Could not submit your review — please try again.");
    return;
  }

  form.reset();
  reviewRating = 0;
  wrap_off_stars();
  show("Thanks! Your review will appear once it's approved.");
  loadReviews();
}

function wrap_off_stars() {
  const wrap = document.getElementById("review-stars");
  if (wrap) wrap.querySelectorAll("button").forEach((b) => b.classList.remove("on"));
}

setupReviewStars();
document.getElementById("review-form")?.addEventListener("submit", submitReview);
loadReviews();

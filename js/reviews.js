async function loadReviews() {
    const box = document.getElementById("review-list");
    if (!box) return;
    box.textContent = "Loading reviews…";

    const { data, error } = await db
        .from("reviews")
        .select("*")
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

    data.forEach(review => {
        const card = document.createElement("article");
        card.className = "review";
        const stars = document.createElement("div");
        stars.className = "stars";
        const rating = Math.max(0, Math.min(5, Number(review.rating) || 0));
        stars.textContent = "★".repeat(rating) + "☆".repeat(5 - rating);
        const message = document.createElement("p");
        message.textContent = `“${review.message || ""}”`;
        const name = document.createElement("strong");
        name.textContent = `— ${review.name || "Anonymous"}`;
        card.append(stars, message, name);
        box.append(card);
    });
}

async function submitReview(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    const { error } = await db.from("reviews").insert({
        name: document.getElementById("review-name").value.trim(),
        rating: Number(document.getElementById("review-rating").value),
        message: document.getElementById("review-message").value.trim()
    });
    button.disabled = false;
    if (error) {
        console.error("Could not submit review:", error);
        alert("Could not submit your review.");
        return;
    }
    form.reset();
    loadReviews();
}

document.getElementById("review-form")?.addEventListener("submit", submitReview);
loadReviews();

async function loadAdminReviews() {

    const box = document.getElementById("admin-reviews");

    if (!box) return;

    box.innerHTML = `
        <div class="question-loading">
            Loading reviews...
        </div>
    `;

    const { data, error } = await db
        .from("reviews")
        .select("*")
        .order("created_at", {
            ascending: false
        });

    if (error) {

        console.error("Reviews loading error:", error);

        box.innerHTML = `
            <div class="question-error">
                <strong>Unable to load reviews.</strong>
                <p>${escapeHTML(error.message)}</p>
            </div>
        `;

        return;
    }

    box.replaceChildren();

    if (!data || data.length === 0) {

        box.innerHTML = `
            <div class="question-empty">
                <h3>No reviews yet</h3>
                <p>Reviews submitted by visitors will appear here.</p>
            </div>
        `;

        return;
    }

    data.forEach(review => {

        const card = document.createElement("article");
        card.className = "admin-review-card";

        const header = document.createElement("div");
        header.className = "admin-review-header";

        const identity = document.createElement("div");

        const nameLabel = document.createElement("div");
        nameLabel.className = "review-label";
        nameLabel.textContent = "Reviewer";

        const name = document.createElement("strong");
        name.textContent = review.name || "Anonymous";

        identity.append(
            nameLabel,
            name
        );

        const date = document.createElement("span");
        date.className = "review-date";

        if (review.created_at) {
            date.textContent =
                new Date(review.created_at).toLocaleString();
        }

        header.append(
            identity,
            date
        );


        const fields = document.createElement("div");
        fields.className = "admin-review-fields";


        /* NAME */

        const nameField = document.createElement("div");
        nameField.className = "review-field";

        const nameFieldLabel = document.createElement("label");
        nameFieldLabel.textContent = "Name";

        const nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.value = review.name || "";

        nameField.append(
            nameFieldLabel,
            nameInput
        );


        /* RATING */

        const ratingField = document.createElement("div");
        ratingField.className = "review-field";

        const ratingLabel = document.createElement("label");
        ratingLabel.textContent = "Rating";

        const ratingSelect = document.createElement("select");

        for (let i = 1; i <= 5; i++) {

            const option = document.createElement("option");

            option.value = String(i);
            option.textContent = `${i}/5`;

            if (Number(review.rating) === i) {
                option.selected = true;
            }

            ratingSelect.append(option);
        }

        ratingField.append(
            ratingLabel,
            ratingSelect
        );


        /* MESSAGE */

        const messageField = document.createElement("div");
        messageField.className = "review-field review-field-full";

        const messageLabel = document.createElement("label");
        messageLabel.textContent = "Review";

        const messageInput = document.createElement("textarea");
        messageInput.value = review.message || "";
        messageInput.placeholder = "Review text...";

        messageField.append(
            messageLabel,
            messageInput
        );


        fields.append(
            nameField,
            ratingField,
            messageField
        );


        /* ACTIONS */

        const actions = document.createElement("div");
        actions.className = "admin-review-actions";

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-review";
        deleteButton.type = "button";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener(
            "click",
            () => deleteAdminReview(review.id)
        );


        const saveButton = document.createElement("button");
        saveButton.className = "primary save-review";
        saveButton.type = "button";
        saveButton.textContent = "Save Review";

        saveButton.addEventListener(
            "click",
            async () => {

                saveButton.disabled = true;
                saveButton.textContent = "Saving...";

                const { error } = await db
                    .from("reviews")
                    .update({
                        name: nameInput.value.trim(),
                        rating: Number(ratingSelect.value),
                        message: messageInput.value.trim()
                    })
                    .eq("id", review.id);

                saveButton.disabled = false;
                saveButton.textContent = "Save Review";

                if (error) {

                    console.error(
                        "Review update error:",
                        error
                    );

                    alert(error.message);

                    return;
                }

                alert("Review saved.");

                loadAdminReviews();
            }
        );


        actions.append(
            deleteButton,
            saveButton
        );


        card.append(
            header,
            fields,
            actions
        );

        box.append(card);
    });
}


/* =========================
   DELETE
========================= */

async function deleteAdminReview(id) {

    if (!confirm("Delete this review?")) {
        return;
    }

    const { error } = await db
        .from("reviews")
        .delete()
        .eq("id", id);

    if (error) {

        console.error(
            "Review delete error:",
            error
        );

        alert(error.message);

        return;
    }

    loadAdminReviews();
}


/* =========================
   LOAD AFTER LOGIN
========================= */

const originalShowDashboard =
    window.showDashboard;

window.showDashboard = function () {

    if (typeof originalShowDashboard === "function") {
        originalShowDashboard();
    }

    loadAdminReviews();
};

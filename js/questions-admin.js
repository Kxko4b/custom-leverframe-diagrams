console.log("questions-admin.js loaded");

async function loadQuestions() {

    // Supports either ID, so we don't get the "container not found" error again
    const box =
        document.getElementById("questions-admin") ||
        document.getElementById("questions");

    if (!box) {
        console.error(
            "Questions container not found. Add <div id=\"questions-admin\"></div> to the Questions section."
        );
        return;
    }

    box.innerHTML = `
        <div class="question-loading">
            Loading questions...
        </div>
    `;

    const { data, error } = await db
        .from("questions")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Could not load questions:", error);

        box.innerHTML = `
            <div class="question-error">
                <strong>Could not load questions</strong>
                <p>${escapeHTML(error.message)}</p>
            </div>
        `;

        return;
    }

    if (!data || data.length === 0) {

        box.innerHTML = `
            <div class="question-empty">
                <div class="question-empty-icon">❓</div>
                <h3>No questions yet</h3>
                <p>Questions submitted by visitors will appear here.</p>
            </div>
        `;

        return;
    }

    box.replaceChildren();

    data.forEach(question => {

        const card = document.createElement("article");
        card.className = "admin-question-card";

        const code =
            question.question_code ||
            "KXQ-UNKNOWN";

        const status =
            question.status ||
            "Pending";

        const questionText =
            question.question ||
            "";

        const contact =
            question.contact ||
            "No contact provided";

        const answer =
            question.answer ||
            "";

        const date =
            question.created_at
                ? new Date(question.created_at).toLocaleString()
                : "Unknown date";

        card.innerHTML = `
            <div class="admin-question-header">

                <div class="question-identity">

                    <span class="question-label">
                        QUESTION
                    </span>

                    <span class="question-code">
                        ${escapeHTML(code)}
                    </span>

                    <span class="question-date">
                        ${escapeHTML(date)}
                    </span>

                </div>

                <span class="question-status">
                    ${escapeHTML(status)}
                </span>

            </div>


            <div class="admin-question-content">

                <div class="question-field">

                    <span class="question-field-label">
                        Question
                    </span>

                    <p>
                        ${escapeHTML(questionText)}
                    </p>

                </div>


                <div class="question-field">

                    <span class="question-field-label">
                        Contact
                    </span>

                    <p>
                        ${escapeHTML(contact)}
                    </p>

                </div>


                <div class="question-field">

                    <label class="question-field-label">
                        Status
                    </label>

                    <select class="question-status-select">

                        <option value="Pending"
                            ${status === "Pending" ? "selected" : ""}>
                            Pending
                        </option>

                        <option value="In Progress"
                            ${status === "In Progress" ? "selected" : ""}>
                            In Progress
                        </option>

                        <option value="Answered"
                            ${status === "Answered" ? "selected" : ""}>
                            Answered
                        </option>

                        <option value="Closed"
                            ${status === "Closed" ? "selected" : ""}>
                            Closed
                        </option>

                    </select>

                </div>


                <div class="question-field full">

                    <label class="question-field-label">
                        Answer
                    </label>

                    <textarea
                        class="question-answer"
                        placeholder="Write your answer here..."
                    >${escapeHTML(answer)}</textarea>

                </div>


                <div class="question-actions">

                    <button
                        type="button"
                        class="primary save-question"
                    >
                        Save Answer
                    </button>

                    <button
                        type="button"
                        class="delete-question"
                    >
                        Delete
                    </button>

                </div>

            </div>
        `;


        // SAVE
        const saveButton =
            card.querySelector(".save-question");

        saveButton.addEventListener("click", async () => {

            const newStatus =
                card.querySelector(".question-status-select").value;

            const newAnswer =
                card.querySelector(".question-answer").value.trim();

            saveButton.disabled = true;
            saveButton.textContent = "Saving...";

            const { error } = await db
                .from("questions")
                .update({
                    status: newStatus,
                    answer: newAnswer
                })
                .eq("id", question.id);

            saveButton.disabled = false;
            saveButton.textContent = "Save Answer";

            if (error) {

                console.error(
                    "Could not update question:",
                    error
                );

                alert(
                    "Could not save question:\n\n" +
                    error.message
                );

                return;
            }

            alert("Question updated!");

            loadQuestions();

        });


        // DELETE
        const deleteButton =
            card.querySelector(".delete-question");

        deleteButton.addEventListener("click", async () => {

            if (
                !confirm(
                    `Delete question ${code}?`
                )
            ) {
                return;
            }

            deleteButton.disabled = true;
            deleteButton.textContent = "Deleting...";

            const { error } = await db
                .from("questions")
                .delete()
                .eq("id", question.id);

            if (error) {

                console.error(
                    "Could not delete question:",
                    error
                );

                alert(
                    "Could not delete question:\n\n" +
                    error.message
                );

                deleteButton.disabled = false;
                deleteButton.textContent = "Delete";

                return;
            }

            loadQuestions();

        });


        box.appendChild(card);

    });

}


/* =========================
   HTML ESCAPING
========================= */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =========================
   SEARCH
========================= */

document
    .getElementById("question-search")
    ?.addEventListener("input", async function () {

        const search =
            this.value.trim().toLowerCase();

        const box =
            document.getElementById("questions-admin") ||
            document.getElementById("questions");

        if (!box) return;

        const { data, error } = await db
            .from("questions")
            .select("*")
            .order("created_at", {
                ascending: false
            });

        if (error) {
            console.error(error);
            return;
        }

        const filtered =
            data.filter(question => {

                return (
                    String(question.question || "")
                        .toLowerCase()
                        .includes(search) ||

                    String(question.contact || "")
                        .toLowerCase()
                        .includes(search) ||

                    String(question.question_code || "")
                        .toLowerCase()
                        .includes(search)
                );

            });

        if (!filtered.length) {

            box.innerHTML = `
                <div class="question-empty">
                    <div class="question-empty-icon">
                        🔎
                    </div>

                    <h3>
                        No matching questions
                    </h3>

                    <p>
                        Try another search term.
                    </p>
                </div>
            `;

            return;
        }

        // Temporarily render filtered results
        box.innerHTML = "";

        filtered.forEach(question => {

            const card =
                document.createElement("article");

            card.className =
                "admin-question-card";

            card.innerHTML = `
                <div class="admin-question-header">

                    <div class="question-identity">

                        <span class="question-label">
                            QUESTION
                        </span>

                        <span class="question-code">
                            ${escapeHTML(
                                question.question_code ||
                                "KXQ-UNKNOWN"
                            )}
                        </span>

                    </div>

                    <span class="question-status">
                        ${escapeHTML(
                            question.status ||
                            "Pending"
                        )}
                    </span>

                </div>

                <div class="admin-question-content">

                    <div class="question-field">

                        <span class="question-field-label">
                            Question
                        </span>

                        <p>
                            ${escapeHTML(
                                question.question
                            )}
                        </p>

                    </div>

                    <div class="question-field">

                        <span class="question-field-label">
                            Contact
                        </span>

                        <p>
                            ${escapeHTML(
                                question.contact
                            )}
                        </p>

                    </div>

                    <div class="question-field full">

                        <span class="question-field-label">
                            Answer
                        </span>

                        <p>
                            ${escapeHTML(
                                question.answer ||
                                "Not answered yet."
                            )}
                        </p>

                    </div>

                </div>
            `;

            box.appendChild(card);

        });

    });


/* =========================
   INITIAL LOAD
========================= */

loadQuestions();

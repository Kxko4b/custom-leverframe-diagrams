console.log("questions-admin.js loaded");


async function loadQuestions() {

    const container = document.getElementById("questions");

    if (!container) {
        console.error("Questions container not found.");
        return;
    }

    container.innerHTML = `
        <p class="empty">
            Loading questions...
        </p>
    `;


    const { data, error } = await db
        .from("questions")
        .select("*")
        .order("created_at", {
            ascending: false
        });


    if (error) {

        console.error(
            "Could not load questions:",
            error
        );

        container.innerHTML = `
            <div class="question-card">
                <p>
                    Could not load questions.
                </p>

                <small>
                    ${escapeHTML(error.message)}
                </small>
            </div>
        `;

        return;
    }


    if (!data || data.length === 0) {

        container.innerHTML = `
            <div class="question-card">
                <p class="empty">
                    No questions yet.
                </p>
            </div>
        `;

        return;
    }


    container.innerHTML = "";


    data.forEach(question => {

        const card = document.createElement("article");

        card.className = "question-card";


        const code =
            question.question_code || "No code";

        const questionText =
            question.question || "";

        const contact =
            question.contact || "";

        const answer =
            question.answer || "";

        const status =
            question.status || "Pending";


        const date =
            question.created_at
                ? new Date(
                    question.created_at
                ).toLocaleString()
                : "Unknown";


        card.innerHTML = `

            <div class="question-header">

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


            <div class="question-content">


                <div class="question-field">

                    <span class="question-field-label">
                        Question
                    </span>

                    <p class="question-text">
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
                        Answer
                    </label>

                    <textarea
                        class="question-answer"
                        data-id="${question.id}"
                        placeholder="Write your answer..."
                    >${escapeHTML(answer)}</textarea>

                </div>


                <div class="question-actions">

                    <select
                        class="question-status-select"
                        data-id="${question.id}"
                    >

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


                    <button
                        type="button"
                        class="primary save-question"
                        data-id="${question.id}"
                    >
                        Save Answer
                    </button>

                </div>

            </div>
        `;


        container.appendChild(card);

    });


    /*
     * SAVE BUTTONS
     */

    container
        .querySelectorAll(".save-question")
        .forEach(button => {

            button.addEventListener(
                "click",
                async () => {

                    const id =
                        button.dataset.id;


                    const answerBox =
                        container.querySelector(
                            `.question-answer[data-id="${id}"]`
                        );


                    const statusBox =
                        container.querySelector(
                            `.question-status-select[data-id="${id}"]`
                        );


                    const answer =
                        answerBox.value.trim();

                    const status =
                        statusBox.value;


                    button.disabled = true;
                    button.textContent = "Saving...";


                    const { error } =
                        await db
                            .from("questions")
                            .update({
                                answer: answer,
                                status: status
                            })
                            .eq("id", id);


                    button.disabled = false;


                    if (error) {

                        console.error(
                            "Could not save question:",
                            error
                        );

                        alert(
                            "Could not save question:\n\n" +
                            error.message
                        );

                        button.textContent =
                            "Save Answer";

                        return;
                    }


                    button.textContent =
                        "Saved ✓";


                    setTimeout(() => {

                        button.textContent =
                            "Save Answer";

                    }, 1500);

                }
            );

        });

}


/*
 * SEARCH
 */

function setupQuestionSearch() {

    const search =
        document.getElementById(
            "question-search"
        );

    if (!search) return;


    search.addEventListener(
        "input",
        () => {

            const value =
                search.value
                    .toLowerCase()
                    .trim();


            document
                .querySelectorAll(
                    ".question-card"
                )
                .forEach(card => {

                    card.style.display =
                        card.textContent
                            .toLowerCase()
                            .includes(value)
                            ? ""
                            : "none";

                });

        }
    );

}


/*
 * ESCAPE HTML
 */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


setupQuestionSearch();

const form =
    document.getElementById("status-form");

const result =
    document.getElementById("request-result");

const questionResult =
    document.getElementById("question-result");

const errorText =
    document.getElementById("status-error");


form.addEventListener("submit", async (event) => {

    event.preventDefault();

    errorText.textContent = "";
    result.hidden = true;

    const code = document
        .getElementById("request-code")
        .value
        .trim()
        .toUpperCase();

    if (!code) {
        errorText.textContent = "Please enter a code.";
        return;
    }


    /*
     * =========================
     * QUESTION CODE
     * =========================
     */

    if (code.startsWith("KXQ-")) {

        const { data: question, error } = await db
            .from("questions")
            .select("*")
            .eq("question_code", code)
            .single();


        if (error || !question) {

            console.error("Question lookup failed:", error);

            errorText.textContent =
                "No question could be found with that code.";

            return;
        }


        displayQuestion(question);

        result.hidden = false;

        return;
    }


    /*
     * =========================
     * REQUEST CODE
     * =========================
     */

    const { data: request, error } = await db
        .from("requests")
        .select("*")
        .eq("request_code", code)
        .single();


    if (error || !request) {

        console.error("Request lookup failed:", error);

        errorText.textContent =
            "No request or question could be found with that code.";

        return;
    }


    displayRequest(request);

    await loadRequestFiles(request.id);

    await loadUpdates(request.id);

    result.hidden = false;

});

async function loadQuestionStatus(code) {

    const {
        data: question,
        error
    } =
        await db
            .from("questions")
            .select("*")
            .eq(
                "question_code",
                code
            )
            .single();


    if (
        error ||
        !question
    ) {

        console.error(error);

        errorText.textContent =
            "No question could be found with that code.";

        return;
    }


    document
        .getElementById(
            "question-display-code"
        )
        .textContent =
            question.question_code;


    document
        .getElementById(
            "question-display-status"
        )
        .textContent =
            question.status ||
            "Pending";


    document
        .getElementById(
            "question-display-question"
        )
        .textContent =
            question.question;


    document
        .getElementById(
            "question-display-answer"
        )
        .textContent =
            question.answer ||
            "Your question hasn't been answered yet.";


    questionResult.hidden =
        false;

}


function displayRequest(request) {

    document.getElementById("display-code").textContent =
        request.request_code;

    document.getElementById("display-status").textContent =
        request.status;

    document.getElementById("display-name").textContent =
        request.name || "—";

    document.getElementById("display-type").textContent =
        request.type || "—";

    document.getElementById("display-size").textContent =
        request.size || "—";


    document.getElementById("display-date").textContent =
        new Date(request.created_at)
        .toLocaleDateString();


    document.getElementById("display-description").textContent =
        request.description || "No description provided.";

}
function displayQuestion(question) {

    /*
     * Hide request-specific information
     */

    const requestDetails = document.getElementById("request-details");

    if (requestDetails) {
        requestDetails.hidden = true;
    }


    /*
     * Question result container
     */

    let questionDetails =
        document.getElementById("question-details");


    if (!questionDetails) {

        questionDetails =
            document.createElement("div");

        questionDetails.id = "question-details";

        result.appendChild(questionDetails);
    }


    questionDetails.hidden = false;


    const date = question.created_at
        ? new Date(question.created_at).toLocaleString()
        : "Unknown";


    const status =
        question.status || "Pending";


    const answer =
        question.answer;


    questionDetails.innerHTML = `
        <div class="question-result">

            <div class="question-result-header">

                <div>

                    <div class="result-label">
                        Question code
                    </div>

                    <strong>
                        ${escapeHTML(question.question_code)}
                    </strong>

                </div>

                <span class="question-status">
                    ${escapeHTML(status)}
                </span>

            </div>


            <div class="question-result-field">

                <div class="result-label">
                    Your question
                </div>

                <p>
                    ${escapeHTML(question.question)}
                </p>

            </div>


            <div class="question-result-field">

                <div class="result-label">
                    Submitted
                </div>

                <p>
                    ${escapeHTML(date)}
                </p>

            </div>


            <div class="question-result-field">

                <div class="result-label">
                    Answer
                </div>

                <p>
                    ${
                        answer
                            ? escapeHTML(answer)
                            : "Your question has not been answered yet."
                    }
                </p>

            </div>

        </div>
    `;

}

async function loadRequestFiles(requestId) {

    const container =
        document.getElementById("request-files");

    container.innerHTML = "";


    const { data, error } =
        await db
        .from("request_images")
        .select("*")
        .eq("request_id", requestId);


    if (error) {

        console.error(error);

        container.innerHTML =
            '<p class="empty">Could not load files.</p>';

        return;
    }


    if (!data.length) {

        container.innerHTML =
            '<p class="empty">No files attached.</p>';

        return;
    }


    for (const file of data) {

        const element =
            document.createElement("div");

        element.className = "file";


        const link =
            document.createElement("a");

        link.href = file.image_url;

        link.target = "_blank";

        link.rel = "noopener";

        link.textContent = "📎 View file";


        element.appendChild(link);

        container.appendChild(element);

    }

}


async function loadUpdates(requestId) {

    const container =
        document.getElementById("request-updates");

    container.innerHTML = "";


    const { data: updates, error } =
        await db
        .from("request_updates")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", {
            ascending: true
        });


    if (error) {

        console.error(error);

        container.innerHTML =
            '<p class="empty">Could not load updates.</p>';

        return;
    }


    if (!updates.length) {

        container.innerHTML =
            '<p class="empty">No updates yet.</p>';

        return;
    }


    for (const update of updates) {

        const element =
            document.createElement("article");

        element.className = "update";


        const header =
            document.createElement("div");

        header.className = "update-header";


        const author =
            document.createElement("span");

        author.className = "update-author";

        author.textContent =
            update.author || "Kxko";


        const date =
            document.createElement("span");

        date.className = "update-date";

        date.textContent =
            new Date(update.created_at)
            .toLocaleString();


        header.appendChild(author);

        header.appendChild(date);


        const message =
            document.createElement("div");

        message.className = "update-message";

        message.textContent =
            update.message;


        element.appendChild(header);

        element.appendChild(message);


        const {
            data: files
        } = await db
        .from("request_update_files")
        .select("*")
        .eq("update_id", update.id);


        if (files && files.length) {

            const fileContainer =
                document.createElement("div");

            fileContainer.className =
                "update-files";


            for (const file of files) {

                const link =
                    document.createElement("a");

                link.href =
                    file.file_url;

                link.target = "_blank";

                link.rel = "noopener";

                link.textContent =
                    `📎 ${file.file_name}`;


                fileContainer.appendChild(link);

            }


            element.appendChild(fileContainer);

        }


        container.appendChild(element);

    }

}

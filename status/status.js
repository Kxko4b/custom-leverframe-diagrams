console.log("status.js loaded");


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
   ELEMENTS
========================= */

const statusForm =
    document.getElementById("status-form");

const statusInput =
    document.getElementById("request-code");

const statusError =
    document.getElementById("status-error");

const requestResult =
    document.getElementById("request-result");

const questionResult =
    document.getElementById("question-result");


/* =========================
   STATUS FORM
========================= */

if (statusForm) {

    statusForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        statusError.textContent = "";

        requestResult.hidden = true;
        questionResult.hidden = true;


        const code =
            statusInput.value
                .trim()
                .toUpperCase();


        if (!code) {
            return;
        }


        /* =========================
           QUESTION
        ========================= */

        if (code.startsWith("KXQ-")) {

            await checkQuestion(code);

            return;
        }


        /* =========================
           REQUEST
        ========================= */

        if (code.startsWith("KXKO-")) {

            await checkRequest(code);

            return;
        }


        /* =========================
           INVALID CODE
        ========================= */

        statusError.textContent =
            "Invalid code. Codes must start with KXKO- or KXQ-.";

    });

}


/* =========================
   CHECK REQUEST
========================= */

async function checkRequest(code) {

    const {
        data: request,
        error
    } = await db
        .from("requests")
        .select("*")
        .eq("request_code", code)
        .maybeSingle();


    if (error) {

        console.error(
            "Request lookup failed:",
            error
        );

        statusError.textContent =
            "Could not check this request.";

        return;
    }


    if (!request) {

        statusError.textContent =
            "No request could be found with that code.";

        return;
    }


    displayRequest(request);

    await loadRequestFiles(request.id);

    await loadUpdates(request.id);

    requestResult.hidden = false;

}


/* =========================
   DISPLAY REQUEST
========================= */

function displayRequest(request) {

    document.getElementById(
        "display-code"
    ).textContent =
        request.request_code || "—";


    document.getElementById(
        "display-status"
    ).textContent =
        request.status || "Pending";


    document.getElementById(
        "display-name"
    ).textContent =
        request.name || "—";


    document.getElementById(
        "display-type"
    ).textContent =
        request.type || "—";


    document.getElementById(
        "display-size"
    ).textContent =
        request.size || "—";


    document.getElementById(
        "display-date"
    ).textContent =
        request.created_at
            ? new Date(
                request.created_at
            ).toLocaleString()
            : "—";


    document.getElementById(
        "display-description"
    ).textContent =
        request.description ||
        "No description provided.";

}


/* =========================
   REQUEST FILES
========================= */

async function loadRequestFiles(requestId) {

    const container =
        document.getElementById(
            "request-files"
        );


    container.innerHTML =
        "<p>Loading files...</p>";


    const {
        data,
        error
    } = await db
        .from("request_images")
        .select("*")
        .eq("request_id", requestId);


    if (error) {

        console.error(
            "Could not load request files:",
            error
        );

        container.innerHTML =
            "<p>Could not load files.</p>";

        return;
    }


    container.innerHTML = "";


    if (!data || data.length === 0) {

        container.innerHTML =
            "<p>No files attached.</p>";

        return;
    }


    data.forEach((file, index) => {

        const link =
            document.createElement("a");

        link.href = file.image_url;

        link.target = "_blank";

        link.rel = "noopener";

        link.textContent =
            `📎 Reference file ${index + 1}`;


        container.appendChild(link);

    });

}


/* =========================
   REQUEST UPDATES
========================= */

async function loadUpdates(requestId) {

    const container =
        document.getElementById(
            "request-updates"
        );


    container.innerHTML =
        "<p>Loading updates...</p>";


    const {
        data: updates,
        error
    } = await db
        .from("request_updates")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", {
            ascending: true
        });


    if (error) {

        console.error(
            "Could not load updates:",
            error
        );

        container.innerHTML =
            "<p>Could not load updates.</p>";

        return;
    }


    container.innerHTML = "";


    if (!updates || updates.length === 0) {

        container.innerHTML =
            "<p>No updates yet.</p>";

        return;
    }


    for (const update of updates) {

        const article =
            document.createElement("article");

        article.className = "update";


        const header =
            document.createElement("div");

        header.className =
            "update-header";


        const author =
            document.createElement("strong");

        author.textContent =
            update.author || "Kxko";


        const date =
            document.createElement("span");

        date.textContent =
            update.created_at
                ? new Date(
                    update.created_at
                ).toLocaleString()
                : "";


        header.append(
            author,
            date
        );


        const message =
            document.createElement("p");

        message.textContent =
            update.message || "";


        article.append(
            header,
            message
        );


        container.appendChild(article);

    }

}


/* =========================
   CHECK QUESTION
========================= */

async function checkQuestion(code) {

    const {
        data: question,
        error
    } = await db
        .from("questions")
        .select("*")
        .eq("question_code", code)
        .maybeSingle();


    if (error) {

        console.error(
            "Question lookup failed:",
            error
        );

        statusError.textContent =
            "Could not check this question.";

        return;
    }


    if (!question) {

        statusError.textContent =
            "No question could be found with that code.";

        return;
    }


    displayQuestion(question);

    questionResult.hidden = false;

}


/* =========================
   DISPLAY QUESTION
========================= */

function displayQuestion(question) {

    document.getElementById(
        "question-display-code"
    ).textContent =
        question.question_code || "—";


    document.getElementById(
        "question-display-status"
    ).textContent =
        question.status || "Pending";


    document.getElementById(
        "question-display-question"
    ).textContent =
        question.question ||
        "No question text available.";


    document.getElementById(
        "question-display-answer"
    ).textContent =
        question.answer ||
        "No answer yet. Please check back later.";

}


/* =========================
   INPUT FORMATTING
========================= */

if (statusInput) {

    statusInput.addEventListener(
        "input",
        () => {

            statusInput.value =
                statusInput.value.toUpperCase();

        }
    );

}

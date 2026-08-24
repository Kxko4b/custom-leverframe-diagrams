console.log("questions-admin.js loaded");


let adminQuestions = [];


/* =========================
   LOAD QUESTIONS
========================= */

async function loadQuestions() {

    const container =
        document.getElementById("questions");

    if (!container) {
        console.error("Questions container not found.");
        return;
    }

    container.textContent =
        "Loading questions…";


    const { data, error } =
        await db
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

        container.textContent =
            "Could not load questions.";

        return;
    }


    adminQuestions =
        data || [];


    renderQuestions();

}


/* =========================
   RENDER
========================= */

function renderQuestions() {

    const container =
        document.getElementById("questions");

    if (!container) return;


    const search =
        document
            .getElementById("question-search")
            ?.value
            .trim()
            .toLowerCase() || "";


    const visible =
        adminQuestions.filter(question => {

            const searchable = [

                question.question_code,
                question.question,
                question.contact,
                question.answer

            ]
                .join(" ")
                .toLowerCase();


            return searchable.includes(search);

        });


    container.replaceChildren();


    if (!visible.length) {

        container.append(
            makeQuestionElement(
                "p",
                "",
                "No questions found."
            )
        );

        return;
    }


    visible.forEach(question => {

        container.append(
            createQuestionCard(question)
        );

    });

}


/* =========================
   QUESTION CARD
========================= */

function createQuestionCard(question) {

    const card =
        document.createElement("article");

    card.className =
        "question-card";


    const answered =
        Boolean(
            question.answer &&
            question.answer.trim()
        );


    /* HEADER */

    const header =
        document.createElement("div");

    header.className =
        "question-header";


    const identity =
        document.createElement("div");

    identity.className =
        "question-identity";


    const code =
        makeQuestionElement(
            "strong",
            "question-code",
            question.question_code ||
                "KXQ-UNKNOWN"
        );


    const contact =
        makeQuestionElement(
            "span",
            "question-contact",
            question.contact ||
                "No contact provided"
        );


    const date =
        makeQuestionElement(
            "span",
            "question-date",
            question.created_at
                ? new Date(
                    question.created_at
                ).toLocaleString()
                : "Date unavailable"
        );


    identity.append(
        code,
        contact,
        date
    );


    const status =
        makeQuestionElement(
            "span",
            "question-status" +
                (answered
                    ? " answered"
                    : ""),
            answered
                ? "Answered"
                : "Awaiting answer"
        );


    header.append(
        identity,
        status
    );


    /* CONTENT */

    const content =
        document.createElement("div");

    content.className =
        "question-content";


    /* QUESTION */

    const questionLabel =
        makeQuestionElement(
            "div",
            "question-label",
            "Question"
        );


    const questionBox =
        makeQuestionElement(
            "div",
            "question-box",
            question.question || ""
        );


    /* ANSWER */

    const answerLabel =
        makeQuestionElement(
            "div",
            "question-label",
            "Answer"
        );


    answerLabel.style.marginTop =
        "20px";


    const answer =
        document.createElement("textarea");

    answer.className =
        "question-answer";

    answer.placeholder =
        "Write your answer here…";

    answer.value =
        question.answer || "";


    /* ACTIONS */

    const actions =
        document.createElement("div");

    actions.className =
        "question-actions";


    const deleteButton =
        document.createElement("button");

    deleteButton.type =
        "button";

    deleteButton.className =
        "delete-question";

    deleteButton.textContent =
        "Delete question";


    deleteButton.addEventListener(
        "click",
        () =>
            deleteQuestion(question.id)
    );


    const saveButton =
        document.createElement("button");

    saveButton.type =
        "button";

    saveButton.className =
        "primary";

    saveButton.textContent =
        answered
            ? "Update answer"
            : "Answer question";


    saveButton.addEventListener(
        "click",
        () =>
            saveQuestionAnswer(
                question.id,
                answer.value,
                saveButton
            )
    );


    actions.append(
        deleteButton,
        saveButton
    );


    content.append(
        questionLabel,
        questionBox,
        answerLabel,
        answer,
        actions
    );


    card.append(
        header,
        content
    );


    return card;

}


/* =========================
   SAVE ANSWER
========================= */

async function saveQuestionAnswer(
    id,
    answer,
    button
) {

    answer =
        answer.trim();


    if (!answer) {

        alert(
            "Please enter an answer."
        );

        return;
    }


    button.disabled =
        true;

    button.textContent =
        "Saving…";


    const { error } =
        await db
            .from("questions")
            .update({

                answer: answer,

                answered_at:
                    new Date().toISOString()

            })
            .eq("id", id);


    if (error) {

        console.error(
            "Could not save answer:",
            error
        );

        alert(
            "Could not save the answer:\n" +
            error.message
        );

        button.disabled =
            false;

        button.textContent =
            "Save answer";

        return;
    }


    button.disabled =
        false;

    button.textContent =
        "Saved ✓";


    await loadQuestions();

}


/* =========================
   DELETE QUESTION
========================= */

async function deleteQuestion(id) {

    if (
        !confirm(
            "Delete this question permanently?"
        )
    ) {
        return;
    }


    const { error } =
        await db
            .from("questions")
            .delete()
            .eq("id", id);


    if (error) {

        console.error(
            "Could not delete question:",
            error
        );

        alert(
            "Could not delete question:\n" +
            error.message
        );

        return;
    }


    await loadQuestions();

}


/* =========================
   SEARCH
========================= */

document
    .getElementById("question-search")
    ?.addEventListener(
        "input",
        renderQuestions
    );


/* =========================
   HELPER
========================= */

function makeQuestionElement(
    tag,
    className,
    text
) {

    const element =
        document.createElement(tag);

    if (className) {
        element.className =
            className;
    }

    if (text !== undefined) {
        element.textContent =
            text;
    }

    return element;

}

console.log("questions-admin.js loaded");


let adminQuestions = [];


const QUESTION_STATUSES = [
    "Pending",
    "In Progress",
    "Answered",
    "Closed"
];


/* =========================
   LOAD QUESTIONS
========================= */

async function loadQuestions() {

    const container =
        document.getElementById("questions-admin");

    if (!container) return;

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


    adminQuestions = data || [];

    renderQuestions();

}


/* =========================
   RENDER
========================= */

function renderQuestions() {

    const container =
        document.getElementById("questions-admin");

    if (!container) return;


    const search =
        (
            document
                .getElementById("question-search")
                ?.value || ""
        )
        .trim()
        .toLowerCase();


    const filter =
        document
            .getElementById("question-filter")
            ?.value || "all";


    const visible =
        adminQuestions.filter(question => {

            const searchable = [

                question.question_code,

                question.question,

                question.contact

            ]
                .join(" ")
                .toLowerCase();


            return (

                (!search ||
                    searchable.includes(search))

                &&

                (
                    filter === "all" ||
                    question.status === filter
                )

            );

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


    /*
     * Header
     */

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
            "div",
            "question-code",
            question.question_code ||
            `KXKO-QSTN-${question.id}`
        );


    const date =
        makeQuestionElement(
            "div",
            "question-date",
            question.created_at
                ? new Date(
                    question.created_at
                ).toLocaleString()
                : "Unknown date"
        );


    identity.append(
        code,
        date
    );


    const status =
        makeQuestionElement(
            "span",
            "question-status",
            question.status || "Pending"
        );


    header.append(
        identity,
        status
    );


    /*
     * Content
     */

    const content =
        document.createElement("div");

    content.className =
        "question-content";


    const questionLabel =
        makeQuestionElement(
            "div",
            "question-label",
            "Question"
        );


    const questionText =
        makeQuestionElement(
            "div",
            "question-text",
            question.question || ""
        );


    const contactLabel =
        makeQuestionElement(
            "div",
            "question-label",
            "Contact"
        );


    const contact =
        makeQuestionElement(
            "div",
            "question-contact",
            question.contact || "Not provided"
        );


    /*
     * Answer
     */

    const answerLabel =
        makeQuestionElement(
            "div",
            "question-label",
            "Answer"
        );


    const answer =
        document.createElement("textarea");

    answer.className =
        "question-answer";

    answer.placeholder =
        "Write your answer here…";

    answer.value =
        question.answer || "";


    /*
     * Controls
     */

    const controls =
        document.createElement("div");

    controls.className =
        "question-controls";


    const select =
        document.createElement("select");

    QUESTION_STATUSES.forEach(status => {

        select.add(
            new Option(
                status,
                status,
                status === question.status,
                status === question.status
            )
        );

    });


    const save =
        document.createElement("button");

    save.type =
        "button";

    save.className =
        "primary";

    save.textContent =
        "Save";


    save.addEventListener(
        "click",
        () => saveQuestion(
            question.id,
            answer.value,
            select.value,
            save
        )
    );


    const deleteButton =
        document.createElement("button");

    deleteButton.type =
        "button";

    deleteButton.className =
        "delete-request";

    deleteButton.textContent =
        "Delete";


    deleteButton.addEventListener(
        "click",
        () => deleteQuestion(
            question.id
        )
    );


    controls.append(
        select,
        save,
        deleteButton
    );


    content.append(

        questionLabel,
        questionText,

        contactLabel,
        contact,

        answerLabel,
        answer,

        controls

    );


    card.append(
        header,
        content
    );


    return card;

}


/* =========================
   SAVE
========================= */

async function saveQuestion(
    id,
    answer,
    status,
    button
) {

    button.disabled =
        true;

    button.textContent =
        "Saving…";


    const { error } =
        await db
            .from("questions")
            .update({

                answer:
                    answer.trim() || null,

                status:
                    status

            })
            .eq("id", id);


    button.disabled =
        false;

    button.textContent =
        "Save";


    if (error) {

        console.error(error);

        alert(
            "Could not save question."
        );

        return;
    }


    /*
     * Update local copy.
     */

    const question =
        adminQuestions.find(
            item => item.id === id
        );


    if (question) {

        question.answer =
            answer.trim() || null;

        question.status =
            status;

    }


    renderQuestions();

}


/* =========================
   DELETE
========================= */

async function deleteQuestion(id) {

    if (
        !confirm(
            "Delete this question?"
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

        console.error(error);

        alert(
            "Could not delete question."
        );

        return;
    }


    await loadQuestions();

}


/* =========================
   HELPERS
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


/* =========================
   FILTERS
========================= */

document
    .getElementById("question-search")
    ?.addEventListener(
        "input",
        renderQuestions
    );


document
    .getElementById("question-filter")
    ?.addEventListener(
        "change",
        renderQuestions
    );

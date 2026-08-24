console.log("questions.js loaded");

const questionForm = document.getElementById("question-form");

if (questionForm) {

    questionForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const question =
            document.getElementById("question").value.trim();

        const contact =
            document.getElementById("contact").value.trim();

        if (!question || !contact) {
            alert("Please fill in all fields.");
            return;
        }

        /*
         * Generate a question code.
         *
         * Example:
         * KXKO-QSTN-7F3A
         */

        const questionCode =
            "KXKO-QSTN-" +
            Math.random()
                .toString(36)
                .substring(2, 6)
                .toUpperCase();


       const { data, error } = await db
    .from("questions")
    .insert({
        question,
        contact
    })
    .select("question_code")
    .single();

if (error) {
    console.error(error);
    alert(error.message);
    return;
}

alert(
    `Question submitted!\n\nYour question code is:\n${data.question_code}\n\nSave this code to check your answer later.`
);

questionForm.reset();


        if (error) {

            console.error(
                "Question submission failed:",
                error
            );

            alert(error.message);

            return;
        }


        /*
         * Show the code to the customer.
         */

        alert(
            "Question submitted!\n\n" +
            "Your question code is:\n" +
            questionCode +
            "\n\n" +
            "Keep this code so you can check your answer later."
        );


        questionForm.reset();

    });

}

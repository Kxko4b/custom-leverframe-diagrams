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


        const { error } =
            await db
                .from("questions")
                .insert({

                    question_code: questionCode,

                    question: question,

                    contact: contact,

                    status: "Pending",

                    answer: null

                });


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

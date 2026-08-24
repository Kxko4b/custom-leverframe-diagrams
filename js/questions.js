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
         * Generate question code
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


        /*
         * Insert question
         */

        const { data, error } =

            await db
                .from("questions")
                .insert({

                    question: question,
                    contact: contact,
                    question_code: questionCode,
                    status: "Pending"

                })
                .select("*")
                .single();


        /*
         * Handle error
         */

        if (error) {

            console.error(
                "Question submission failed:",
                error
            );

            alert(error.message);

            return;
        }


        /*
         * Success
         */

        alert(
            "Question submitted!\n\n" +

            "Your question code is:\n" +

            data.question_code +

            "\n\n" +

            "Keep this code so you can check your answer later."
        );


        questionForm.reset();

    });

}

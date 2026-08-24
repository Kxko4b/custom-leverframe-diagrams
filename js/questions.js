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


        // Generate a question code
        // Example: KXQ-A7F3-92KM

        const part1 =
            Math.random()
                .toString(36)
                .substring(2, 6)
                .toUpperCase();

        const part2 =
            Math.random()
                .toString(36)
                .substring(2, 6)
                .toUpperCase();

        const questionCode =
            `KXQ-${part1}-${part2}`;


        console.log("Generated question code:", questionCode);


        // Submit question

        const { data, error } = await db
            .from("questions")
            .insert({
                question: question,
                contact: contact,
                question_code: questionCode,
                status: "Pending"
            })
            .select("question_code")
            .single();


        if (error) {

            console.error(
                "Question submission failed:",
                error
            );

            alert(error.message);

            return;
        }


        // Success

        alert(
            "Question submitted!\n\n" +
            "Your question code is:\n\n" +
            data.question_code +
            "\n\n" +
            "Keep this code to check your answer later."
        );


        questionForm.reset();

    });

}

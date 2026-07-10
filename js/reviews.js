async function loadReviews() {

    const box = document.getElementById("review-list");


    const { data, error } = await db
        .from("reviews")
        .select("*")
        .order("created_at", {
            ascending: false
        });



    if (error) {

        console.error(error);

        box.innerHTML =
            "<p>Unable to load reviews.</p>";

        return;

    }



    if (!data || data.length === 0) {

        box.innerHTML =
            "<p>No reviews yet.</p>";

        return;

    }



    box.innerHTML = "";



    data.forEach(review => {


        box.innerHTML += `

        <div class="review">


            <div class="stars">

                ${"★".repeat(review.rating)}
                ${"☆".repeat(5 - review.rating)}

            </div>


            <p>
                "${review.message}"
            </p>


            <strong>
                - ${review.name}
            </strong>


        </div>

        `;


    });


}



loadReviews();





document
.getElementById("review-form")
.addEventListener("submit", async (event) => {


    event.preventDefault();



    const name =
        document.getElementById("review-name").value;



    const rating =
        Number(
            document.getElementById("review-rating").value
        );



    const message =
        document.getElementById("review-message").value;



    const { error } = await db
        .from("reviews")
        .insert({

            name,
            rating,
            message

        });



    if (error) {

        console.error(error);

        alert("Could not submit review.");

        return;

    }



    alert("Review submitted!");

    location.reload();


});

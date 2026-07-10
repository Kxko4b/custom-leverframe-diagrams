async function loadGallery() {

    const gallery = document.getElementById("gallery");

    const { data, error } = await db
        .from("examples")
        .select("*")
        .order("created_at", {
            ascending: false
        });


    if (error) {

        console.error(error);

        gallery.innerHTML =
            "<p>Unable to load examples.</p>";

        return;

    }


    if (!data || data.length === 0) {

        gallery.innerHTML =
            "<p>No examples available yet.</p>";

        return;

    }


    gallery.innerHTML = "";


    data.forEach(example => {

        gallery.innerHTML += `

        <div class="example">

            <img
            src="${example.image_url}"
            alt="${example.title}"
            loading="lazy"
            class="zoom-image">


            <h3>
            ${example.title}
            </h3>


            <p>
            ${example.description ?? ""}
            </p>

        </div>

        `;

    });


    setupZoom();

}





function setupZoom() {

    const images = document.querySelectorAll(".zoom-image");

    const lightbox = document.getElementById("lightbox");

    const lightboxImg = document.getElementById("lightbox-img");


    if (!lightbox || !lightboxImg) {

        console.error("Lightbox not found");

        return;

    }


    images.forEach(image => {

        image.style.cursor = "zoom-in";


       image.addEventListener("click", () => {

    console.log("IMAGE CLICKED", image.src);

    lightbox.style.display = "flex";

    lightboxImg.src = image.src;

});
    });



    lightbox.addEventListener("click", () => {

        lightbox.style.display = "none";

    });



    document.addEventListener("keydown", (event) => {

        if (event.key === "Escape") {

            lightbox.style.display = "none";

        }

    });

}





loadGallery();

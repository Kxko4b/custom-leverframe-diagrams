console.log("gallery.js loaded");


async function loadGallery() {

    const gallery = document.getElementById("gallery");

    if (!gallery) {
        console.error("Gallery element not found");
        return;
    }


    const { data, error } = await db
        .from("example")
        .select("*")
        .order("created_at", {
            ascending: false
        });


    if (error) {
        console.error("Gallery error:", error);
        return;
    }


    gallery.innerHTML = "";


    data.forEach(item => {

        gallery.innerHTML += `
            <div class="gallery-item">
                <img 
                    src="${item.image_url}"
                    class="gallery-image"
                    alt="Leverframe diagram">
            </div>
        `;

    });


    setupLightbox();

}




function setupLightbox() {

    const lightbox = document.getElementById("lightbox");
    const lightboxImg = document.getElementById("lightbox-img");

    const images = document.querySelectorAll(".gallery-image");


    if (!lightbox || !lightboxImg) {
        console.error("Lightbox missing");
        return;
    }


    images.forEach(image => {

        image.style.cursor = "zoom-in";


        image.addEventListener("click", () => {

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

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

        gallery.innerHTML = "<p>Unable to load examples.</p>";

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

            <h3>${example.title}</h3>

            <p>${example.description ?? ""}</p>

        </div>

        `;

    });


    addZoom();

}



function addZoom() {

    const lightbox = document.getElementById("lightbox");
    const lightboxImg = document.getElementById("lightbox-img");


    document.querySelectorAll(".zoom-image").forEach(img => {


        img.onclick = function() {

            lightboxImg.src = this.src;

            lightbox.style.display = "flex";

        };


    });



    lightbox.onclick = function() {

        lightbox.style.display = "none";

    };


}



loadGallery();

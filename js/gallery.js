console.log("gallery.js loaded");


async function loadGallery() {


    const gallery =
        document.getElementById("gallery");


    if (!gallery) return;



    const { data, error } =
        await db
        .from("gallery")
        .select("*")
        .order("created_at", {
            ascending: false
        });



    if (error) {

        console.error(
            "Gallery error:",
            error
        );

        return;

    }




    gallery.innerHTML = "";



    data.forEach(item => {


        gallery.innerHTML += `

        <div class="gallery-item">

            <img 
            src="${item.image_url}"
            alt="Leverframe diagram"
            class="gallery-image">

        </div>

        `;


    });



    setupLightbox();


}






function setupLightbox(){


    const images =
        document.querySelectorAll(
            ".gallery-image"
        );



    const lightbox =
        document.getElementById(
            "lightbox"
        );


    const lightboxImg =
        document.getElementById(
            "lightbox-img"
        );



    if(!lightbox || !lightboxImg)
        return;



    images.forEach(img => {


        img.style.cursor =
        "zoom-in";



        img.onclick = () => {


            lightbox.style.display =
            "flex";


            lightboxImg.src =
            img.src;


        };


    });



    lightbox.onclick = () => {


        lightbox.style.display =
        "none";


    };



    document.addEventListener(
        "keydown",
        (event)=>{


            if(event.key === "Escape"){

                lightbox.style.display =
                "none";

            }


        }
    );


}





loadGallery();

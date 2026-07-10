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
            >


            <h3>
            ${example.title}
            </h3>


            <p>
            ${example.description ?? ""}
            </p>

        </div>

        `;


    });
.lightbox{
    display:none;
    position:fixed;
    inset:0;
    background:rgba(0,0,0,.9);
    justify-content:center;
    align-items:center;
    z-index:9999;
    cursor:zoom-out;
}

.lightbox img{
    max-width:95%;
    max-height:95%;
    object-fit:contain;
    border-radius:8px;
    box-shadow:0 0 30px rgba(0,0,0,.5);
}




loadGallery();

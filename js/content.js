console.log("content.js loaded");


async function loadContent() {

    const { data, error } = await db
    .from("site_content")
    .select("*");


    if (error) {

        console.error("Content error:", error);

        return;

    }


    console.log("Loaded content:", data);


    for (const item of data) {


        const text = (item.content || "")
            .replace(/\n/g, "<br>");



        if (item.id === "about") {

            const about =
                document.getElementById("about-text");


            if (about) {

                about.innerHTML = text;

            }

        }



        if (item.id === "terms") {

            const terms =
                document.getElementById("terms-text");


            if (terms) {

                terms.innerHTML = text;

            }

        }


    }

}


loadContent();

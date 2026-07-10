console.log("content.js loaded");


async function loadContent(){


    const { data, error } = await db
        .from("site_content")
        .select("*");



    if(error){

        console.error(
            "Content loading failed:",
            error
        );

        return;

    }



    console.log(
        "Loaded content:",
        data
    );



    data.forEach(item => {


        if(item.section === "about"){

           if (item.id === "about") {
    document.getElementById("about-text").innerHTML =
        item.content.replace(/\n/g, "<br>");
}

            if(about){

                about.innerHTML =
                item.content;

            }

        }





       if (item.id === "terms") {
    document.getElementById("terms-text").innerHTML =
        item.content.replace(/\n/g, "<br>");
}

            if(terms){

                terms.innerHTML =
                item.content;

            }

        }


    });


}





document.addEventListener(
"DOMContentLoaded",
()=>{

    loadContent();

});

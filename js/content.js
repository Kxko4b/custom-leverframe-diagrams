async function loadContent(){

    const {data,error} =
    await db
    .from("site_content")
    .select("*");


    if(error){

        console.error(error);
        return;

    }


    data.forEach(item=>{


        if(item.section === "about"){

            document
            .getElementById("about-text")
            .innerHTML = item.content;

        }



        if(item.section === "terms"){

            document
            .getElementById("terms-text")
            .innerHTML = item.content;

        }


    });


}



loadContent();

async function loadAdminContent(){


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
            .getElementById("about-editor")
            .value = item.content;

        }


        if(item.section === "terms"){

            document
            .getElementById("terms-editor")
            .value = item.content;

        }


    });


}





async function saveContent(){


    const about =
    document
    .getElementById("about-editor")
    .value;



    const terms =
    document
    .getElementById("terms-editor")
    .value;




    const aboutUpdate =
    await db
    .from("site_content")
    .update({

        content: about,
        updated_at: new Date()

    })
    .eq("section","about");





    const termsUpdate =
    await db
    .from("site_content")
    .update({

        content: terms,
        updated_at: new Date()

    })
    .eq("section","terms");





    if(aboutUpdate.error || termsUpdate.error){


        console.error(
            aboutUpdate.error ||
            termsUpdate.error
        );


        alert("Save failed.");

        return;

    }



    alert("Website content updated!");

}





document
.addEventListener(
"DOMContentLoaded",
()=>{


    const button =
    document.getElementById("save-content");



    if(button){

        button.onclick = saveContent;

    }



    loadAdminContent();


});

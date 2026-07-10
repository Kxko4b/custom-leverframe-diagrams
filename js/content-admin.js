console.log("content-admin.js loaded");
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

    console.log("Save button clicked");


    const about =
    document
    .getElementById("about-editor")
    .value;


    const terms =
    document
    .getElementById("terms-editor")
    .value;


    console.log("About:", about);
    console.log("Terms:", terms);



    const aboutUpdate =
    await db
    .from("site_content")
    .update({
        content: about,
        updated_at: new Date()
    })
    .eq("section", "about")
    .select();



    console.log("About result:", aboutUpdate);




    const termsUpdate =
    await db
    .from("site_content")
    .update({
        content: terms,
        updated_at: new Date()
    })
    .eq("section", "terms")
    .select();



    console.log("Terms result:", termsUpdate);



    if(aboutUpdate.error || termsUpdate.error){

        alert("Save failed. Check console.");

        return;

    }


    alert("Saved!");

}



  

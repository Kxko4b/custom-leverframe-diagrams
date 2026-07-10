console.log("content-admin.js loaded");


async function loadAdminContent() {

    const { data, error } = await db
        .from("site_content")
        .select("*");


    if (error) {

        console.error("Loading content failed:", error);
        return;

    }



    data.forEach(item => {


        if (item.section === "about") {

            document
            .getElementById("about-editor")
            .value = item.content;

        }



        if (item.section === "terms") {

            document
            .getElementById("terms-editor")
            .value = item.content;

        }


    });


}





async function saveContent() {


    console.log("Save button clicked");



    const about =
        document
        .getElementById("about-editor")
        .value;



    const terms =
        document
        .getElementById("terms-editor")
        .value;



    console.log("Saving about:", about);
    console.log("Saving terms:", terms);




    const aboutResult = await db
        .from("site_content")
        .update({

            content: about,
            updated_at: new Date()

        })
        .eq("section", "about");





    if (aboutResult.error) {

        console.error(
            "About update failed:",
            aboutResult.error
        );

        alert("About update failed");

        return;

    }





    const termsResult = await db
        .from("site_content")
        .update({

            content: terms,
            updated_at: new Date()

        })
        .eq("section", "terms");





    if (termsResult.error) {

        console.error(
            "Terms update failed:",
            termsResult.error
        );

        alert("Terms update failed");

        return;

    }





    alert("Website content saved!");

}







document.addEventListener(
"DOMContentLoaded",
()=>{


    console.log("DOM ready");


    const button =
        document.getElementById("save-content");



    console.log(
        "Save button:",
        button
    );



    if(button){

        button.addEventListener(
            "click",
           

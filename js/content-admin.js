console.log("content-admin.js loaded");


async function loadAdminContent() {

    const { data, error } = await db
        .from("site_content")
        .select("*");


    if (error) {
        console.error(error);
        return;
    }


    data.forEach(item => {

        if (item.section === "about") {

            document.getElementById("about-editor").value = item.content;

        }


        if (item.section === "terms") {

            document.getElementById("terms-editor").value = item.content;

        }

    });

}





async function saveContent() {

    console.log("Save button clicked");


    const about =
        document.getElementById("about-editor").value;


    const terms =
        document.getElementById("terms-editor").value;



    const { error: aboutError } = await db
        .from("site_content")
        .update({
            content: about,
            updated_at: new Date()
        })
        .eq("section", "about");



    if (aboutError) {

        console.error(aboutError);
        alert("About save failed");
        return;

    }



    const { error: termsError } = await db
        .from("site_content")
        .update({
            content: terms,
            updated_at: new Date()
        })
        .eq("section", "terms");



    if (termsError) {

        console.error(termsError);
        alert("Terms save failed");
        return;

    }



    alert("Content saved!");

}





document.addEventListener("DOMContentLoaded", () => {


    console.log("DOM ready");


    const button = document.getElementById("save-content");


    console.log("Button:", button);



    if (button) {

        button.addEventListener(
            "click",
            saveContent
        );

    }


    loadAdminContent();


});

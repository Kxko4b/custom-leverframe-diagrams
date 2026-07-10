document
.getElementById("save-content")
.onclick = async()=>{


    const about =
    document
    .getElementById("about-editor")
    .value;


    const terms =
    document
    .getElementById("terms-editor")
    .value;



    const { error: aboutError } =
    await db
    .from("site_content")
    .update({
        content: about,
        updated_at: new Date()
    })
    .eq("section","about");



    const { error: termsError } =
    await db
    .from("site_content")
    .update({
        content: terms,
        updated_at: new Date()
    })
    .eq("section","terms");



    if(aboutError || termsError){

        console.error(
            aboutError || termsError
        );

        alert("Could not save.");

        return;

    }



    alert("Content saved!");

};

function generateRequestCode() {

    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for (let i = 0; i < 10; i++) {

        code += chars.charAt(
            Math.floor(Math.random() * chars.length)
        );

    }


    return "KXD-" + code.slice(0,4) + "-" + code.slice(4,8);

}





document
.getElementById("request-form")
.addEventListener("submit", async (event) => {


    event.preventDefault();



    const submitButton =
        event.target.querySelector("button");


    submitButton.disabled = true;
    submitButton.textContent = "Sending...";





    const requestCode =
        generateRequestCode();





    const name =
        document.getElementById("request-name").value;


    const discord =
        document.getElementById("request-discord").value;


    const email =
        document.getElementById("request-email").value;


    const size =
        document.getElementById("request-size").value;


    const type =
        document.getElementById("request-type").value;


    const description =
        document.getElementById("request-description").value;


    const files =
        document.getElementById("request-images").files;






    const { data: request, error } =
        await db
        .from("requests")
        .insert({

            name,
            discord,
            email,
            size,
            type,
            description,

            status: "Pending",

            request_code: requestCode

        })
        .select()
        .single();





 if(error){

    alert(error.message);

    console.error(error);

    return;

}





    for(const file of files){


        const filename =
        `requests/${request.id}-${Date.now()}-${file.name}`;





        const upload =
        await db.storage
        .from("diagram-files")
        .upload(
            filename,
            file
        );



        if(upload.error){

            console.error(upload.error);

            continue;

        }





        const url =
        db.storage
        .from("diagram-files")
        .getPublicUrl(filename)
        .data
        .publicUrl;






        await db
        .from("request_images")
        .insert({

            request_id: request.id,

            image_url: url

        });


    }






    alert(
`Request submitted successfully!

Your request code:

${requestCode}

Save this code to check your progress.`
    );





    event.target.reset();


    submitButton.disabled = false;
    submitButton.textContent = "Send Request";


});

console.log("Supabase loaded:", SUPABASE_KEY.substring(0,15));

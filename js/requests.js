document
.getElementById("request-form")
.addEventListener("submit", async (event) => {

    event.preventDefault();


    const submitButton =
        event.target.querySelector("button");

    submitButton.disabled = true;
    submitButton.textContent = "Sending...";



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



    // Create request

    const { data: request, error: requestError } =
        await db
            .from("requests")
            .insert({

                name,
                discord,
                email,
                size,
                type,
                description,
                status: "Pending"

            })
            .select()
            .single();



    if (requestError) {

        console.error(requestError);

        alert("Failed to submit request.");

        submitButton.disabled = false;
        submitButton.textContent = "Send Request";

        return;

    }



    // Upload images

    for (const file of files) {

        const filename =
            `requests/${request.id}-${Date.now()}-${file.name}`;



        const upload =
            await db.storage
                .from("diagram-files")
                .upload(filename, file);



        if (upload.error) {

            console.error(upload.error);

            continue;

        }



        const publicUrl =
            db.storage
                .from("diagram-files")
                .getPublicUrl(filename)
                .data
                .publicUrl;



        await db
            .from("request_images")
            .insert({

                request_id: request.id,
                image_url: publicUrl

            });

    }



    alert("Request submitted successfully!");

    document.getElementById("request-form").reset();

    submitButton.disabled = false;
    submitButton.textContent = "Send Request";

});

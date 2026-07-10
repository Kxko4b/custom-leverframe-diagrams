console.log("requests-admin.js loaded");



async function loadRequests() {


    const container =
        document.getElementById("requests-list");


    if (!container) {

        console.error("requests-list not found");
        return;

    }




    const { data: requests, error } =
        await db
        .from("requests")
        .select("*")
        .order("created_at", {
            ascending: false
        });




    if (error) {

        console.error(
            "Loading requests failed:",
            error
        );

        container.innerHTML =
        "<p>Could not load requests.</p>";

        return;

    }




    container.innerHTML = "";




    if (!requests || requests.length === 0) {

        container.innerHTML =
        "<p>No requests yet.</p>";

        return;

    }





    for (const request of requests) {


        const { data: images, error: imageError } =
            await db
            .from("request_images")
            .select("image_url")
            .eq("request_id", request.id);




        if(imageError){

            console.error(
                "Image loading error:",
                imageError
            );

        }





        let imageHTML = "";



        if(images && images.length > 0){


            images.forEach(image => {


                imageHTML += `

                <div style="margin:15px 0;">

                    <img
                    src="${image.image_url}"
                    width="250"
                    style="display:block;"
                    >


                    <a
                    href="${image.image_url}"
                    target="_blank">
                    Open image
                    </a>

                </div>

                `;


            });


        } else {


            imageHTML =
            "<p>No files uploaded</p>";


        }






        container.innerHTML += `

        <div class="request-card">


            <h3>
            Request ${request.request_code}
            </h3>



            <p>
            <strong>Name:</strong>
            ${request.name}
            </p>



            <p>
            <strong>Email:</strong>
            ${request.email || "Not provided"}
            </p>



            <p>
            <strong>Discord:</strong>
            ${request.discord || "Not provided"}
            </p>



            <p>
            <strong>Size:</strong>
            ${request.size}
            </p>



            <p>
            <strong>Type:</strong>
            ${request.type}
            </p>



            <p>
            <strong>Description:</strong><br>
            ${request.description || ""}
            </p>




            <h4>
            Reference Images
            </h4>


            ${imageHTML}





            <label>
            Status:
            </label>


            <select
            onchange="updateRequestStatus(${request.id}, this.value)"
            >


                <option value="Pending"
                ${request.status === "Pending" ? "selected":""}>
                Pending
                </option>


                <option value="Accepted"
                ${request.status === "Accepted" ? "selected":""}>
                Accepted
                </option>


                <option value="In Progress"
                ${request.status === "In Progress" ? "selected":""}>
                In Progress
                </option>


                <option value="Completed"
                ${request.status === "Completed" ? "selected":""}>
                Completed
                </option>


                <option value="Cancelled"
                ${request.status === "Cancelled" ? "selected":""}>
                Cancelled
                </option>


            </select>



            <br><br>


            <button onclick="deleteRequest(${request.id})">
            Delete Request
            </button>



        </div>


        `;


    }


}









async function updateRequestStatus(id, status){



    const { error } =
        await db
        .from("requests")
        .update({

            status: status

        })
        .eq("id", id);




    if(error){

        console.error(error);

        alert(
            "Could not update status."
        );

    }


}









async function deleteRequest(id){



    if(!confirm(
        "Delete this request?"
    )) return;






    const { data: images } =
        await db
        .from("request_images")
        .select("image_url")
        .eq("request_id", id);







    if(images){


        for(const image of images){


            const path =
            image.image_url
            .split("/diagram-files/")
            [1];



            if(path){

                await db.storage
                .from("diagram-files")
                .remove([
                    path
                ]);

            }


        }


    }







    await db
    .from("request_images")
    .delete()
    .eq("request_id", id);






    const { error } =
        await db
        .from("requests")
        .delete()
        .eq("id", id);






    if(error){

        console.error(error);

        alert(
            "Delete failed."
        );

        return;

    }




    loadRequests();


}






loadRequests();

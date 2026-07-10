async function loadRequests() {


    const container =
        document.getElementById("requests-list");


    if (!container) return;




 const { data, error } =
    await db
    .from("requests")
    .select("*")
    .order("created_at", {
        ascending:false
    });


for (const request of data) {

    const { data: images } =
        await db
        .from("request_images")
        .select("image_url")
        .eq("request_id", request.id);


    request.request_images = images;

}





    if (error) {

        console.error(error);

        container.innerHTML =
        "<p>Could not load requests.</p>";

        return;

    }





    container.innerHTML = "";





    if (!data || data.length === 0) {

        container.innerHTML =
        "<p>No requests yet.</p>";

        return;

    }






    data.forEach(request => {


        let images = "";




        if (request.request_images && request.request_images.length > 0) {


            request.request_images.forEach(image => {


                images += `

                <div style="margin-bottom:15px;">

                    <img
                    src="${image.image_url}"
                    width="200"
                    style="display:block;"
                    >


                    <a href="${image.image_url}" target="_blank">
                    Open image
                    </a>

                </div>

                `;


            });


        } else {


            images = "No files uploaded";


        }







        container.innerHTML += `


        <div class="request-card">


            <h3>
            Request #${String(request.id).padStart(4,"0")}
            </h3>



            <p>
            <strong>Request Code:</strong>
            ${request.request_code}
            </p>



            <p>
            <strong>Name:</strong>
            ${request.name}
            </p>



            <p>
            <strong>Discord:</strong>
            ${request.discord || "Not provided"}
            </p>



            <p>
            <strong>Email:</strong>
            ${request.email || "Not provided"}
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
            ${request.description || "No description"}
            </p>




            <h4>
            Reference Images
            </h4>


            ${images}




            <label>
            Status:
            </label>


            <select
            onchange="updateRequestStatus(${request.id}, this.value)"
            >


                <option value="Pending"
                ${request.status === "Pending" ? "selected" : ""}>
                Pending
                </option>



                <option value="Accepted"
                ${request.status === "Accepted" ? "selected" : ""}>
                Accepted
                </option>



                <option value="In Progress"
                ${request.status === "In Progress" ? "selected" : ""}>
                In Progress
                </option>



                <option value="Completed"
                ${request.status === "Completed" ? "selected" : ""}>
                Completed
                </option>



                <option value="Cancelled"
                ${request.status === "Cancelled" ? "selected" : ""}>
                Cancelled
                </option>


            </select>




            <br><br>



            <button onclick="deleteRequest(${request.id})">
            Delete Request
            </button>



        </div>


        `;


    });


}









async function updateRequestStatus(id, status) {


    const { error } =
        await db
        .from("requests")
        .update({

            status: status

        })
        .eq("id", id);





    if(error){

        console.error(error);

        alert("Failed to update status.");

        return;

    }



}









async function deleteRequest(id) {


    const confirmDelete =
        confirm(
            "Delete this request permanently?"
        );



    if(!confirmDelete)
        return;





    // delete images first

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
                .remove([path]);

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
            "Could not delete request."
        );

        return;

    }





    alert(
        "Request deleted."
    );



    loadRequests();


}






loadRequests();

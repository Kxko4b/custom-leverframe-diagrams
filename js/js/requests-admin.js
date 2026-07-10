async function loadRequests() {

    const container =
        document.getElementById("requests-list");


    const { data, error } =
        await db
        .from("requests")
        .select(`
            *,
            request_images (
                image_url
            )
        `)
        .order("created_at", {
            ascending: false
        });



    if(error){

        console.error(error);

        container.innerHTML =
        "<p>Could not load requests.</p>";

        return;

    }



    container.innerHTML = "";



    if(data.length === 0){

        container.innerHTML =
        "<p>No requests yet.</p>";

        return;

    }





    data.forEach(request => {



        let images = "";



        request.request_images.forEach(image => {


            images += `

            <img
            src="${image.image_url}"
            width="200"
            >

            `;


        });





        container.innerHTML += `

        <div class="request-card">


            <h3>
            ${request.name}
            </h3>


            <p>
            ID: KXD-${String(request.id).padStart(4,"0")}
            </p>


            <p>
            Discord:
            ${request.discord || "Not provided"}
            </p>


            <p>
            Email:
            ${request.email || "Not provided"}
            </p>


            <p>
            Size:
            ${request.size}
            </p>


            <p>
            Type:
            ${request.type}
            </p>



            <p>
            ${request.description}
            </p>



            <h4>
            Images:
            </h4>


            ${images}



            <select
            onchange="updateRequestStatus(${request.id}, this.value)"
            >


            <option ${request.status==="Pending"?"selected":""}>
            Pending
            </option>


            <option ${request.status==="Accepted"?"selected":""}>
            Accepted
            </option>


            <option ${request.status==="In Progress"?"selected":""}>
            In Progress
            </option>


            <option ${request.status==="Completed"?"selected":""}>
            Completed
            </option>


            <option ${request.status==="Cancelled"?"selected":""}>
            Cancelled
            </option>


            </select>


        </div>

        `;


    });


}





async function updateRequestStatus(id, status){


    const {error} =
        await db
        .from("requests")
        .update({

            status

        })
        .eq("id", id);



    if(error){

        console.error(error);

        alert("Could not update status.");

    }


}

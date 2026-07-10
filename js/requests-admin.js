async function loadRequests() {
if(request.file_url){

    html += `
    <p>
    File:
    <a href="${request.file_url}" target="_blank">
    Open file
    </a>
    </p>
    `;

}
    const container =
        document.getElementById("requests-list");


    if (!container) return;



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


    if (request.request_images) {

        request.request_images.forEach(image => {

            images += `

            <div>

            <img 
            src="${image.image_url}"
            width="200"
            style="display:block;margin:10px 0;"
            >

            <a href="${image.image_url}" target="_blank">
            Open image
            </a>

            </div>

            `;

        });

    }




    container.innerHTML += `

    <div class="request-card">


        <h3>
        KXD-${String(request.id).padStart(4,"0")}
        </h3>


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
        ${request.description || ""}
        </p>



        <h4>
        Reference Images
        </h4>


        ${images || "No files uploaded"}




        <select
        onchange="updateRequestStatus(${request.id}, this.value)"
        >

            <option ${request.status === "Pending" ? "selected" : ""}>
            Pending
            </option>

            <option ${request.status === "Accepted" ? "selected" : ""}>
            Accepted
            </option>

            <option ${request.status === "In Progress" ? "selected" : ""}>
            In Progress
            </option>

            <option ${request.status === "Completed" ? "selected" : ""}>
            Completed
            </option>

            <option ${request.status === "Cancelled" ? "selected" : ""}>
            Cancelled
            </option>

        </select>


        <button onclick="deleteRequest(${request.id})">
        Delete Request
        </button>


    </div>

    `;


});




     


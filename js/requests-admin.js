console.log("requests-admin.js loaded");


async function loadRequests() {

    const container = document.getElementById("requests");

    if (!container) {
        console.error("requests container not found");
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

        console.error("Loading requests failed:", error);

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

        if (imageError) {
            console.error(
                "Image loading error:",
                imageError
            );
        }


        let imageHTML = "";

        if (images && images.length > 0) {

            imageHTML = `
                <div class="file-list">
            `;

            images.forEach((image, index) => {

                imageHTML += `
                    <div class="file">
                        <a
                            href="${image.image_url}"
                            target="_blank"
                        >
                            Reference image ${index + 1}
                        </a>
                    </div>
                `;

            });

            imageHTML += `
                </div>
            `;

        } else {

            imageHTML =
                "<p>No files uploaded.</p>";

        }


        const createdDate =
            request.created_at
                ? new Date(request.created_at).toLocaleString()
                : "Unknown";


        container.innerHTML += `

            <div
                class="request"
                data-request-id="${request.id}"
            >

                <button
                    class="request-head"
                    type="button"
                    onclick="toggleRequest(this)"
                >

                    <div class="code">
                        ${escapeHTML(request.request_code)}
                    </div>

                    <div class="name">
                        ${escapeHTML(request.name || "Unknown")}
                    </div>

                    <div class="status">
                        ${escapeHTML(request.status || "Pending")}
                    </div>

                    <div class="arrow">
                        ▼
                    </div>

                </button>


                <div class="details">

                    <div class="details-inner">

                        <div class="content">

                            <div class="grid">


                                <div class="field">

                                    <label>
                                        Name
                                    </label>

                                    <input
                                        value="${escapeHTML(request.name || "")}"
                                        readonly
                                    >

                                </div>


                                <div class="field">

                                    <label>
                                        Email
                                    </label>

                                    <input
                                        value="${escapeHTML(request.email || "Not provided")}"
                                        readonly
                                    >

                                </div>


                                <div class="field">

                                    <label>
                                        Discord
                                    </label>

                                    <input
                                        value="${escapeHTML(request.discord || "Not provided")}"
                                        readonly
                                    >

                                </div>


                                <div class="field">

                                    <label>
                                        Size
                                    </label>

                                    <input
                                        value="${escapeHTML(request.size || "")}"
                                        readonly
                                    >

                                </div>


                                <div class="field">

                                    <label>
                                        Type
                                    </label>

                                    <input
                                        value="${escapeHTML(request.type || "")}"
                                        readonly
                                    >

                                </div>


                                <div class="field">

                                    <label>
                                        Created
                                    </label>

                                    <input
                                        value="${escapeHTML(createdDate)}"
                                        readonly
                                    >

                                </div>


                                <div class="field full">

                                    <label>
                                        Description
                                    </label>

                                    <textarea readonly>${escapeHTML(request.description || "")}</textarea>

                                </div>


                                <div class="field full">

                                    <label>
                                        Reference Images
                                    </label>

                                    ${imageHTML}

                                </div>


                                <div class="field">

                                    <label>
                                        Status
                                    </label>

                                    <select
                                        onchange="updateRequestStatus(${request.id}, this.value)"
                                    >

                                        <option
                                            value="Pending"
                                            ${request.status === "Pending" ? "selected" : ""}
                                        >
                                            Pending
                                        </option>

                                        <option
                                            value="Accepted"
                                            ${request.status === "Accepted" ? "selected" : ""}
                                        >
                                            Accepted
                                        </option>

                                        <option
                                            value="In Progress"
                                            ${request.status === "In Progress" ? "selected" : ""}
                                        >
                                            In Progress
                                        </option>

                                        <option
                                            value="Completed"
                                            ${request.status === "Completed" ? "selected" : ""}
                                        >
                                            Completed
                                        </option>

                                        <option
                                            value="Cancelled"
                                            ${request.status === "Cancelled" ? "selected" : ""}
                                        >
                                            Cancelled
                                        </option>

                                    </select>

                                </div>


                            </div>


                            <div class="save-row">

                                <button
                                    class="delete-example"
                                    type="button"
                                    onclick="deleteRequest(${request.id})"
                                >
                                    Delete Request
                                </button>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

        `;
    }
}


/* =========================
   OPEN / CLOSE REQUEST
========================= */

function toggleRequest(button) {

    const request =
        button.closest(".request");

    if (!request) return;

    request.classList.toggle("open");
}


/* =========================
   UPDATE STATUS
========================= */

async function updateRequestStatus(id, status) {

    const { error } =
        await db
            .from("requests")
            .update({
                status: status
            })
            .eq("id", id);

    if (error) {

        console.error(error);

        alert("Could not update status.");

        return;
    }


    /*
     * Update the status displayed
     * in the collapsed request header.
     */

    const request =
        document.querySelector(
            `.request[data-request-id="${id}"]`
        );

    if (request) {

        const statusElement =
            request.querySelector(".request-head .status");

        if (statusElement) {
            statusElement.textContent = status;
        }
    }

}


/* =========================
   DELETE REQUEST
========================= */

async function deleteRequest(id) {

    if (!confirm("Delete this request?")) {
        return;
    }


    /*
     * Find associated images
     */

    const { data: images } =
        await db
            .from("request_images")
            .select("image_url")
            .eq("request_id", id);


    /*
     * Delete images from storage
     */

    if (images) {

        for (const image of images) {

            const parts =
                image.image_url.split("/diagram-files/");

            const path = parts[1];

            if (path) {

                await db.storage
                    .from("diagram-files")
                    .remove([path]);

            }
        }
    }


    /*
     * Delete image database records
     */

    const { error: imageDeleteError } =
        await db
            .from("request_images")
            .delete()
            .eq("request_id", id);


    if (imageDeleteError) {

        console.error(
            "Could not delete request images:",
            imageDeleteError
        );

    }


    /*
     * Delete request
     */

    const { error } =
        await db
            .from("requests")
            .delete()
            .eq("id", id);


    if (error) {

        console.error(error);

        alert("Delete failed.");

        return;
    }


    loadRequests();
}


/* =========================
   HTML ESCAPING
========================= */

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

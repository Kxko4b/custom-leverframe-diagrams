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

/* Redesigned request cards with editing and customer-facing updates. */
const REQUEST_STATUSES = ["Pending", "Accepted", "In Progress", "Completed", "Cancelled"];
const UPDATE_AUTHOR = "Kxko";
let adminRequests = [];

async function loadRequests() {
    const container = document.getElementById("requests");
    if (!container) return;
    container.textContent = "Loading requests…";
    const { data, error } = await db.from("requests")
        .select("*, request_images ( image_url )")
        .order("created_at", { ascending: false });
    if (error) return showRequestError(container, "Could not load requests.", error);
    adminRequests = data || [];
    renderAdminRequests();
}

function renderAdminRequests() {
    const container = document.getElementById("requests");
    if (!container) return;
    const query = (document.getElementById("search")?.value || "").trim().toLowerCase();
    const filter = document.getElementById("filter")?.value || "all";
    const visible = adminRequests.filter(request => {
        const searchable = [request.request_code, request.name, request.email, request.discord, request.type].join(" ").toLowerCase();
        return (!query || searchable.includes(query)) && (filter === "all" || request.status === filter);
    });
    container.replaceChildren();
    if (!visible.length) return container.append(makeElement("p", "", "No requests match your filters."));
    visible.forEach(request => container.append(makeRequestCard(request)));
}

function makeRequestCard(request) {
    const card = makeElement("article", "request-card");
    const header = makeElement("button", "request-header");
    header.type = "button";
    const identity = makeElement("div", "request-identity");
    identity.append(makeElement("span", "request-code-label", "Request code"));
    identity.append(makeElement("strong", "request-code", request.request_code || `KXD-${String(request.id).padStart(4, "0")}`));
    identity.append(makeElement("span", "request-name", request.name || "Unnamed request"));
    const meta = makeElement("div", "request-meta");
    meta.append(makeElement("span", "request-date", request.created_at ? new Date(request.created_at).toLocaleString() : "Date unavailable"));
    meta.append(makeElement("span", "request-status", request.status || "Pending"));
    meta.append(makeElement("span", "request-toggle", "View details"));
    header.append(identity, meta);
    header.addEventListener("click", () => {
        const opened = card.classList.toggle("open");
        header.setAttribute("aria-expanded", String(opened));
        meta.querySelector(".request-toggle").textContent = opened ? "Hide details" : "View details";
    });

    const content = makeElement("div", "request-content");
    const form = document.createElement("form");
    form.className = "request-edit-form";
    form.addEventListener("submit", event => saveRequestEdits(event, request.id));
    const grid = makeElement("div", "request-grid");
    grid.append(editField("Name", "name", request.name), editField("Email", "email", request.email, "email"));
    grid.append(editField("Discord", "discord", request.discord), editField("Size", "size", request.size));
    grid.append(editField("Type", "type", request.type), statusField(request.status || "Pending"));
    grid.append(editField("Description", "description", request.description, "textarea", true));
    grid.append(referenceImages(request.request_images || []));
    const controls = makeElement("div", "request-controls");
    const save = makeElement("button", "primary", "Save changes"); save.type = "submit";
    const remove = makeElement("button", "delete-request", "Delete request"); remove.type = "button";
    remove.addEventListener("click", () => deleteRequest(request.id));
    controls.append(save, remove); form.append(grid, controls);
    content.append(form, createUpdatesPanel(request.id)); card.append(header, content);
    loadAdminUpdates(request.id, content.querySelector(".updates-list"));
    return card;
}

function editField(label, name, value, type = "text", full = false) {
    const wrapper = makeElement("label", `request-field${full ? " full" : ""}`);
    wrapper.append(makeElement("span", "request-field-label", label));
    const input = type === "textarea" ? document.createElement("textarea") : document.createElement("input");
    input.name = name; input.value = value || ""; if (type !== "textarea") input.type = type;
    wrapper.append(input); return wrapper;
}

function statusField(current) {
    const wrapper = makeElement("label", "request-field"); wrapper.append(makeElement("span", "request-field-label", "Status"));
    const select = document.createElement("select"); select.name = "status"; select.className = "request-status-select";
    REQUEST_STATUSES.forEach(status => select.add(new Option(status, status, status === current, status === current)));
    wrapper.append(select); return wrapper;
}

function referenceImages(images) {
    const wrapper = makeElement("div", "request-field full"); wrapper.append(makeElement("div", "request-field-label", "Reference images"));
    const list = makeElement("div", "request-images");
    if (!images.length) list.append(makeElement("span", "request-field-value", "No reference images uploaded."));
    images.forEach((image, index) => { const link = document.createElement("a"); link.className = "request-image"; link.href = image.image_url; link.target = "_blank"; link.rel = "noopener"; const picture = document.createElement("img"); picture.src = image.image_url; picture.alt = `Reference image ${index + 1}`; link.append(picture); list.append(link); });
    wrapper.append(list); return wrapper;
}

function createUpdatesPanel(requestId) {
    const panel = makeElement("section", "request-updates-section"); panel.append(makeElement("h3", "updates-title", "Customer updates")); panel.append(makeElement("div", "updates-list", "Loading updates…"));
    const form = document.createElement("form"); form.className = "new-update"; form.addEventListener("submit", event => postRequestUpdate(event, requestId));
    const message = document.createElement("textarea"); message.className = "new-message"; message.name = "message"; message.placeholder = "Write an update for the customer…"; message.required = true;
    const actions = makeElement("div", "update-actions"); const attach = makeElement("label", "file-button", "Attach files"); const files = document.createElement("input"); files.type = "file"; files.name = "files"; files.multiple = true; attach.append(files);
    const submit = makeElement("button", "primary", "Post update"); submit.type = "submit"; actions.append(attach, submit); form.append(message, actions); panel.append(form); return panel;
}

async function saveRequestEdits(event, id) {
    event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('[type="submit"]'); button.disabled = true; button.textContent = "Saving…";
    const values = Object.fromEntries(new FormData(form)); const { error } = await db.from("requests").update(values).eq("id", id);
    button.disabled = false; button.textContent = "Save changes"; if (error) return showRequestError(null, "Could not save request changes.", error); await loadRequests();
}

async function postRequestUpdate(event, requestId) {
    event.preventDefault(); const form = event.currentTarget; const message = form.elements.message.value.trim(); const button = form.querySelector('[type="submit"]'); if (!message) return;
    button.disabled = true; button.textContent = "Posting…";
    const { data: update, error } = await db.from("request_updates").insert({ request_id: requestId, author: UPDATE_AUTHOR, message }).select().single();
    if (error) { button.disabled = false; button.textContent = "Post update"; return showRequestError(null, "Could not post the update.", error); }
    for (const file of Array.from(form.elements.files.files || [])) await uploadAdminUpdateFile(update.id, requestId, file);
    form.reset(); button.disabled = false; button.textContent = "Post update"; await loadAdminUpdates(requestId, form.closest(".request-updates-section").querySelector(".updates-list"));
}

async function uploadAdminUpdateFile(updateId, requestId, file) {
    const path = `request-updates/${requestId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const { error: uploadError } = await db.storage.from("diagram-files").upload(path, file); if (uploadError) return showRequestError(null, `Could not upload ${file.name}.`, uploadError);
    const publicUrl = db.storage.from("diagram-files").getPublicUrl(path).data.publicUrl;
    const { error } = await db.from("request_update_files").insert({ update_id: updateId, file_name: file.name, file_url: publicUrl }); if (error) showRequestError(null, `Could not attach ${file.name}.`, error);
}

async function loadAdminUpdates(requestId, container) {
    const { data, error } = await db.from("request_updates").select("*, request_update_files (*)").eq("request_id", requestId).order("created_at", { ascending: true });
    if (error) return showRequestError(container, "Could not load updates.", error); container.replaceChildren(); if (!data?.length) return container.append(makeElement("p", "empty", "No updates yet."));
    data.forEach(update => { const item = makeElement("article", "update"); const heading = makeElement("div", "update-header"); heading.append(makeElement("span", "author", update.author || UPDATE_AUTHOR), makeElement("span", "date", new Date(update.created_at).toLocaleString())); item.append(heading, makeElement("div", "message", update.message || "")); if (update.request_update_files?.length) { const files = makeElement("div", "update-files"); update.request_update_files.forEach(file => { const link = document.createElement("a"); link.href = file.file_url; link.target = "_blank"; link.rel = "noopener"; link.textContent = `📎 ${file.file_name}`; files.append(link); }); item.append(files); } container.append(item); });
}

function makeElement(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
function showRequestError(container, message, error) { console.error(message, error); if (container) container.textContent = message; else alert(`${message} ${error?.message || ""}`.trim()); }
document.getElementById("search")?.addEventListener("input", renderAdminRequests);
document.getElementById("filter")?.addEventListener("change", renderAdminRequests);

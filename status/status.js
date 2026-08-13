/* =========================
   Theme
   ========================= */

const themeToggle = document.getElementById("theme-toggle");

const savedTheme = localStorage.getItem("theme");

if (savedTheme === "dark") {
    document.documentElement.classList.add("dark");
}

if (themeToggle) {

    themeToggle.addEventListener("click", () => {

        const isDark =
            document.documentElement.classList.toggle("dark");

        localStorage.setItem(
            "theme",
            isDark ? "dark" : "light"
        );

    });


    themeToggle.addEventListener("keydown", (event) => {

        if (
            event.key === "Enter" ||
            event.key === " "
        ) {

            event.preventDefault();

            themeToggle.click();

        }

    });

}


/* =========================
   Request Status
   ========================= */

const form = document.getElementById("status-form");

const result = document.getElementById("request-result");

const errorText = document.getElementById("status-error");


form.addEventListener("submit", async (event) => {

    event.preventDefault();

    errorText.textContent = "";

    result.hidden = true;


    const code =
        document
        .getElementById("request-code")
        .value
        .trim()
        .toUpperCase();


    if (!code) {
        return;
    }


    const { data: request, error } =
        await db
        .from("requests")
        .select("*")
        .eq("request_code", code)
        .single();


    if (error || !request) {

        console.error(error);

        errorText.textContent =
            "No request could be found with that code.";

        return;
    }


    displayRequest(request);

    await loadRequestFiles(request.id);

    await loadUpdates(request.id);

    result.hidden = false;

});


function displayRequest(request) {

    document.getElementById("display-code").textContent =
        request.request_code;

    document.getElementById("display-status").textContent =
        request.status;

    document.getElementById("display-name").textContent =
        request.name || "—";

    document.getElementById("display-type").textContent =
        request.type || "—";

    document.getElementById("display-size").textContent =
        request.size || "—";


    document.getElementById("display-date").textContent =
        new Date(request.created_at)
        .toLocaleDateString();


    document.getElementById("display-description").textContent =
        request.description || "No description provided.";

}


async function loadRequestFiles(requestId) {

    const container =
        document.getElementById("request-files");

    container.innerHTML = "";


    const { data, error } =
        await db
        .from("request_images")
        .select("*")
        .eq("request_id", requestId);


    if (error) {

        console.error(error);

        container.innerHTML =
            '<p class="empty">Could not load files.</p>';

        return;
    }


    if (!data.length) {

        container.innerHTML =
            '<p class="empty">No files attached.</p>';

        return;
    }


    for (const file of data) {

        const element =
            document.createElement("div");

        element.className = "file";


        const link =
            document.createElement("a");

        link.href = file.image_url;

        link.target = "_blank";

        link.rel = "noopener";

        link.textContent = "📎 View file";


        element.appendChild(link);

        container.appendChild(element);

    }

}


async function loadUpdates(requestId) {

    const container =
        document.getElementById("request-updates");

    container.innerHTML = "";


    const { data: updates, error } =
        await db
        .from("request_updates")
        .select("*")
        .eq("request_id", requestId)
        .order("created_at", {
            ascending: true
        });


    if (error) {

        console.error(error);

        container.innerHTML =
            '<p class="empty">Could not load updates.</p>';

        return;
    }


    if (!updates.length) {

        container.innerHTML =
            '<p class="empty">No updates yet.</p>';

        return;
    }


    for (const update of updates) {

        const element =
            document.createElement("article");

        element.className = "update";


        const header =
            document.createElement("div");

        header.className = "update-header";


        const author =
            document.createElement("span");

        author.className = "update-author";

        author.textContent =
            update.author || "Kxko";


        const date =
            document.createElement("span");

        date.className = "update-date";

        date.textContent =
            new Date(update.created_at)
            .toLocaleString();


        header.appendChild(author);

        header.appendChild(date);


        const message =
            document.createElement("div");

        message.className = "update-message";

        message.textContent =
            update.message;


        element.appendChild(header);

        element.appendChild(message);


        const {
            data: files
        } = await db
        .from("request_update_files")
        .select("*")
        .eq("update_id", update.id);


        if (files && files.length) {

            const fileContainer =
                document.createElement("div");

            fileContainer.className =
                "update-files";


            for (const file of files) {

                const link =
                    document.createElement("a");

                link.href =
                    file.file_url;

                link.target = "_blank";

                link.rel = "noopener";

                link.textContent =
                    `📎 ${file.file_name}`;


                fileContainer.appendChild(link);

            }


            element.appendChild(fileContainer);

        }


        container.appendChild(element);

    }

}

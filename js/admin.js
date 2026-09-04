
const ADMIN_EMAIL = "haleannson@gmail.com";

const loginBox = document.getElementById("login");
const dashboard = document.getElementById("app");
const loginButton = document.getElementById("login-button");
const logoutButton = document.getElementById("logout-button");
const errorBox = document.getElementById("error");

const statusText = document.querySelector(".admin-status");
const statusDot = document.querySelector(".status-dot");


/* =========================================================
   CONNECTION STATUS
========================================================= */

function setConnectionStatus(status, message) {

    if (!statusText || !statusDot) return;

    statusText.lastChild.textContent = ` ${message}`;

    if (status === "connected") {

        statusDot.style.background = "#42a06b";
        statusDot.style.boxShadow = "0 0 0 4px rgba(66,160,107,0.12)";

    } else if (status === "checking") {

        statusDot.style.background = "#d6a83a";
        statusDot.style.boxShadow = "0 0 0 4px rgba(214,168,58,0.12)";

    } else {

        statusDot.style.background = "#c94b43";
        statusDot.style.boxShadow = "0 0 0 4px rgba(201,75,67,0.12)";
    }
}


async function checkSupabaseConnection() {

    setConnectionStatus("checking", "Checking...");

    try {

        const { error } = await db
            .from("requests")
            .select("id", {
                count: "exact",
                head: true
            });

        if (error) {
            throw error;
        }

        setConnectionStatus("connected", "Connected");

    } catch (error) {

        console.error("Supabase connection check failed:", error);

        setConnectionStatus("error", "Connection error");
    }
}


/* =========================================================
   OVERVIEW STATS
========================================================= */

async function loadOverviewStats() {

    try {

        /* =========================
           REQUESTS
        ========================= */

        const { count: totalRequests, error: requestError } =
            await db
                .from("requests")
                .select("id", {
                    count: "exact",
                    head: true
                });

        if (requestError) throw requestError;


        const { count: pendingRequests, error: pendingError } =
            await db
                .from("requests")
                .select("id", {
                    count: "exact",
                    head: true
                })
                .eq("status", "Pending");

        if (pendingError) throw pendingError;


        const { count: progressRequests, error: progressError } =
            await db
                .from("requests")
                .select("id", {
                    count: "exact",
                    head: true
                })
                .eq("status", "In Progress");

        if (progressError) throw progressError;


        const { count: completedRequests, error: completedError } =
            await db
                .from("requests")
                .select("id", {
                    count: "exact",
                    head: true
                })
                .eq("status", "Completed");

        if (completedError) throw completedError;


        /* =========================
           QUESTIONS
        ========================= */

        const { count: openQuestions, error: questionError } =
            await db
                .from("questions")
                .select("id", {
                    count: "exact",
                    head: true
                })
                .in("status", ["Pending", "In Progress"]);

        if (questionError) throw questionError;


        /* =========================
           REVIEWS
        ========================= */

        const { count: reviews, error: reviewError } =
            await db
                .from("reviews")
                .select("id", {
                    count: "exact",
                    head: true
                });

        if (reviewError) throw reviewError;


        /* =========================
           EXAMPLES
        ========================= */

        const { count: examples, error: exampleError } =
            await db
                .from("examples")
                .select("id", {
                    count: "exact",
                    head: true
                });

        if (exampleError) throw exampleError;


        /* =========================
           UPDATE UI
        ========================= */

        setStat("stat-total-requests", totalRequests);
        setStat("stat-pending", pendingRequests);
        setStat("stat-progress", progressRequests);
        setStat("stat-completed", completedRequests);

        setStat("stat-open-questions", openQuestions);
        setStat("stat-reviews", reviews);
        setStat("stat-examples", examples);

    } catch (error) {

        console.error("Could not load overview statistics:", error);

        setStat("stat-total-requests", "—");
        setStat("stat-pending", "—");
        setStat("stat-progress", "—");
        setStat("stat-completed", "—");

        setStat("stat-open-questions", "—");
        setStat("stat-reviews", "—");
        setStat("stat-examples", "—");
    }
}


function setStat(id, value) {

    const element = document.getElementById(id);

    if (!element) return;

    element.textContent =
        value === null || value === undefined
            ? "0"
            : value;
}


/* =========================================================
   SESSION
========================================================= */

async function checkSession() {

    const { data, error } =
        await db.auth.getUser();

    if (error) {

        console.error(
            "Session check error:",
            error
        );

        return;
    }

    if (
        data.user &&
        data.user.email.toLowerCase() ===
        ADMIN_EMAIL.toLowerCase()
    ) {

        showDashboard();
    }
}


/* =========================================================
   SHOW DASHBOARD
========================================================= */

function showDashboard() {

    loginBox.classList.add("hidden");

    dashboard.classList.remove("hidden");

    loadAdminExamples();

    if (typeof loadRequests === "function") {
        loadRequests();
    }

    if (typeof loadQuestions === "function") {
        loadQuestions();
    }

    if (typeof loadAdminReviews === "function") {
        loadAdminReviews();
    }

    loadOverviewStats();

    checkSupabaseConnection();
}


/* =========================================================
   LOGIN
========================================================= */

loginButton.onclick = async () => {

    const email =
        document
            .getElementById("admin-email")
            .value
            .trim();

    const password =
        document
            .getElementById("admin-password")
            .value;

    errorBox.textContent = "";

    if (!email || !password) {

        errorBox.textContent =
            "Please enter your email and password.";

        return;
    }

    loginButton.disabled = true;

    loginButton.textContent =
        "Signing in...";


    const { data, error } =
        await db.auth.signInWithPassword({
            email,
            password
        });


    loginButton.disabled = false;

    loginButton.textContent =
        "Sign In";


    if (error) {

        console.error(
            "Login error:",
            error
        );

        errorBox.textContent =
            error.message;

        return;
    }


    if (
        !data.user ||
        data.user.email.toLowerCase() !==
        ADMIN_EMAIL.toLowerCase()
    ) {

        await db.auth.signOut();

        errorBox.textContent =
            "You are not authorized to access the admin dashboard.";

        return;
    }


    showDashboard();
};


/* =========================================================
   EXAMPLES
========================================================= */

async function loadAdminExamples() {

    const list =
        document.getElementById("example-list");

    if (!list) return;


    const { data, error } =
        await db
            .from("examples")
            .select("*")
            .order("created_at", {
                ascending: false
            });


    if (error) {

        console.error(
            "Could not load examples:",
            error
        );

        list.innerHTML =
            "<p>Could not load examples.</p>";

        return;
    }


    list.innerHTML = "";


    if (!data || data.length === 0) {

        list.innerHTML =
            '<p class="empty">No examples yet.</p>';

        return;
    }


    data.forEach(example => {

        const card =
            document.createElement("div");

        card.className =
            "example";


        card.innerHTML = `

            <img
                src="${escapeHTML(example.image_url || "")}"
                alt="${escapeHTML(example.title || "Example")}"
            >

            <div class="example-content">

                <h3>
                    ${escapeHTML(example.title || "Untitled")}
                </h3>

                <p>
                    ${escapeHTML(example.description || "")}
                </p>

                <div class="example-actions">

                    <button
                        class="delete-example"
                        type="button"
                        onclick="deleteExample(${example.id})"
                    >
                        Delete
                    </button>

                </div>

            </div>

        `;


        list.appendChild(card);

    });
}


/* =========================================================
   ADD EXAMPLE
========================================================= */

document
    .getElementById("add-example")
    ?.addEventListener("click", async () => {

        const title =
            document
                .getElementById("example-title")
                .value
                .trim();

        const description =
            document
                .getElementById("example-description")
                .value
                .trim();

        const file =
            document
                .getElementById("example-image")
                .files[0];


        if (!title || !file) {

            alert(
                "Please enter a title and select an image."
            );

            return;
        }


        const button =
            document.getElementById("add-example");

        button.disabled = true;

        button.textContent =
            "Uploading...";


        try {

            const fileName =
                `${Date.now()}-${file.name.replace(
                    /[^a-zA-Z0-9._-]/g,
                    "-"
                )}`;


            const { error: uploadError } =
                await db.storage
                    .from("diagram-files")
                    .upload(
                        `examples/${fileName}`,
                        file
                    );


            if (uploadError) {
                throw uploadError;
            }


            const publicUrl =
                db.storage
                    .from("diagram-files")
                    .getPublicUrl(
                        `examples/${fileName}`
                    )
                    .data
                    .publicUrl;


            const { error } =
                await db
                    .from("examples")
                    .insert({
                        title,
                        description,
                        image_url: publicUrl
                    });


            if (error) {
                throw error;
            }


            document
                .getElementById("example-title")
                .value = "";

            document
                .getElementById("example-description")
                .value = "";

            document
                .getElementById("example-image")
                .value = "";


            await loadAdminExamples();

            await loadOverviewStats();


        } catch (error) {

            console.error(
                "Could not add example:",
                error
            );

            alert(
                "Could not add example:\n\n" +
                error.message
            );

        } finally {

            button.disabled = false;

            button.textContent =
                "Add Example";
        }

    });


/* =========================================================
   DELETE EXAMPLE
========================================================= */

async function deleteExample(id) {

    if (!confirm("Delete this example?")) {
        return;
    }


    const { data: example } =
        await db
            .from("examples")
            .select("image_url")
            .eq("id", id)
            .single();


    if (example?.image_url) {

        const parts =
            example.image_url.split(
                "/diagram-files/"
            );

        const path =
            parts[1];

        if (path) {

            await db.storage
                .from("diagram-files")
                .remove([path]);
        }
    }


    const { error } =
        await db
            .from("examples")
            .delete()
            .eq("id", id);


    if (error) {

        console.error(
            "Could not delete example:",
            error
        );

        alert(
            "Could not delete example:\n\n" +
            error.message
        );

        return;
    }


    await loadAdminExamples();

    await loadOverviewStats();
}


/* =========================================================
   LOGOUT
========================================================= */

logoutButton.onclick = async () => {

    await db.auth.signOut();

    location.reload();
};


/* =========================================================
   HTML ESCAPING
========================================================= */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   START
========================================================= */

checkSession();

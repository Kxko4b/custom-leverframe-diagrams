const ADMIN_EMAIL = "haleannson@gmail.com";

const loginBox = document.getElementById("login");
const dashboard = document.getElementById("app");
const loginButton = document.getElementById("login-button");
const logoutButton = document.getElementById("logout-button");
const errorBox = document.getElementById("error");


async function checkSession() {

    const { data, error } = await db.auth.getUser();

    if (error) {
        console.error("Session check error:", error);
        return;
    }

    if (
        data.user &&
        data.user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
    ) {
        showDashboard();
    }

}


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

}


loginButton.onclick = async () => {

    const email =
        document.getElementById("admin-email").value.trim();

    const password =
        document.getElementById("admin-password").value;

    errorBox.textContent = "";

    if (!email || !password) {
        errorBox.textContent = "Please enter your email and password.";
        return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "Signing in...";

    const { data, error } =
        await db.auth.signInWithPassword({
            email,
            password
        });

    loginButton.disabled = false;
    loginButton.textContent = "Sign In";

    if (error) {
        console.error("Login error:", error);
        errorBox.textContent = error.message;
        return;
    }

    if (
        !data.user ||
        data.user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()
    ) {

        await db.auth.signOut();

        errorBox.textContent =
            "You are not authorized to access the admin dashboard.";

        return;
    }

    showDashboard();

};


async function loadAdminExamples() {

    const box =
        document.getElementById("example-list");

    const { data, error } =
        await db
        .from("examples")
        .select("*")
        .order("created_at", {
            ascending: false
        });

    if (error) {

        console.error(error);

        box.innerHTML =
            "<p>Unable to load examples.</p>";

        return;

    }

    box.innerHTML = "";

    if (!data || data.length === 0) {

        box.innerHTML =
            "<p>No examples yet.</p>";

        return;

    }

    data.forEach(example => {

        box.innerHTML += `

            <div class="example">

                <img
                    src="${example.image_url}"
                    alt="${example.title}"
                >

                <div class="example-content">

                    <h3>
                        ${example.title}
                    </h3>

                    <p>
                        ${example.description || ""}
                    </p>

                    <div class="example-actions">

                        <button
                            class="delete-example"
                            onclick="deleteExample(${example.id})"
                        >
                            Delete
                        </button>

                    </div>

                </div>

            </div>

        `;

    });

}


document
.getElementById("add-example")
.onclick = async () => {

    const file =
        document
        .getElementById("example-image")
        .files[0];

    if (!file) {

        alert("Please select an image.");

        return;

    }

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

    if (!title) {

        alert("Please enter a title.");

        return;

    }

    const path =
        "examples/" +
        Date.now() +
        "-" +
        file.name;

    const { error: uploadError } =
        await db.storage
        .from("diagram-files")
        .upload(
            path,
            file
        );

    if (uploadError) {

        console.error(uploadError);

        alert(uploadError.message);

        return;

    }

    const imageUrl =
        db.storage
        .from("diagram-files")
        .getPublicUrl(path)
        .data
        .publicUrl;

    const { error } =
        await db
        .from("examples")
        .insert({

            title,
            description,
            image_url: imageUrl

        });

    if (error) {

        console.error(error);

        alert(error.message);

        return;

    }

    alert("Uploaded!");

    document.getElementById("example-title").value = "";
    document.getElementById("example-description").value = "";
    document.getElementById("example-image").value = "";

    loadAdminExamples();

};


async function deleteExample(id) {

    if (!confirm("Delete this example?")) {
        return;
    }

    const { error } =
        await db
        .from("examples")
        .delete()
        .eq("id", id);

    if (error) {

        console.error(error);

        alert(error.message);

        return;

    }

    loadAdminExamples();

}


logoutButton.onclick = async () => {

    await db.auth.signOut();

    location.reload();

};


checkSession();

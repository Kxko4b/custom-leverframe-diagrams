const ADMIN_EMAIL = "haleannson@gmail.com";

const loginBox = document.getElementById("login");
const dashboard = document.getElementById("app");
const errorBox = document.getElementById("error");

async function checkSession() {
    try {
        const { data } = await db.auth.getUser();
        if (data.user && data.user.email === ADMIN_EMAIL) {
            showDashboard();
        }
    } catch (err) {
        console.error("checkSession failed:", err);
    }
}

function showDashboard() {
    loginBox.style.display = "none";
    dashboard.classList.remove("hidden");
    dashboard.style.display = "block";
    loadAdminExamples();
    if (typeof loadRequests === "function") {
        loadRequests();
    }
}

document.getElementById("login-button").onclick = async () => {
    const email = document.getElementById("admin-email").value;
    const password = document.getElementById("admin-password").value;

    try {
        const { error } = await db.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            if (errorBox) errorBox.textContent = error.message;
            else alert(error.message);
            return;
        }

        if (errorBox) errorBox.textContent = "";
        await checkSession();
    } catch (err) {
        console.error("Login failed:", err);
        if (errorBox) errorBox.textContent = "Something went wrong. Check the console for details.";
        else alert("Something went wrong. Check the console for details.");
    }
};

async function loadAdminExamples() {
    const box = document.getElementById("example-list");

    try {
        const { data, error } = await db
            .from("examples")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error(error);
            box.innerHTML = "<p>Unable to load examples.</p>";
            return;
        }

        box.innerHTML = "";
        data.forEach(example => {
            box.innerHTML += `
            <div class="example">
                <img src="${example.image_url}" width="250">
                <h3>${example.title}</h3>
                <button onclick="deleteExample(${example.id})">Delete</button>
            </div>
            `;
        });
    } catch (err) {
        console.error("loadAdminExamples failed:", err);
        box.innerHTML = "<p>Unable to load examples.</p>";
    }
}

document.getElementById("add-example").onclick = async () => {
    const file = document.getElementById("example-image").files[0];

    if (!file) {
        alert("Please select an image.");
        return;
    }

    try {
        const path = "examples/" + Date.now() + "-" + file.name;

        const { error: uploadError } = await db.storage
            .from("diagram-files")
            .upload(path, file);

        if (uploadError) {
            alert(uploadError.message);
            return;
        }

        const imageUrl = db.storage
            .from("diagram-files")
            .getPublicUrl(path)
            .data
            .publicUrl;

        const { error } = await db
            .from("examples")
            .insert({
                title: document.getElementById("example-title").value,
                description: document.getElementById("example-description").value,
                image_url: imageUrl
            });

        if (error) {
            alert(error.message);
            return;
        }

        alert("Uploaded!");
        loadAdminExamples();
    } catch (err) {
        console.error("Upload failed:", err);
        alert("Upload failed. Check the console for details.");
    }
};

async function deleteExample(id) {
    if (!confirm("Delete this example?")) return;

    try {
        const { error } = await db
            .from("examples")
            .delete()
            .eq("id", id);

        if (error) {
            alert(error.message);
            return;
        }

        loadAdminExamples();
    } catch (err) {
        console.error("deleteExample failed:", err);
        alert("Delete failed. Check the console for details.");
    }
}

document.getElementById("logout-button").onclick = async () => {
    try {
        await db.auth.signOut();
        location.reload();
    } catch (err) {
        console.error("Logout failed:", err);
    }
};

checkSession();

<!DOCTYPE html>
<html lang="en">
<head>

<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>Kxko Admin</title>

<link rel="icon" href="../favicon.png">

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="../js/supabase.js"></script>

<style>

/* =========================
   RESET
========================= */

* {
    box-sizing: border-box;
}

:root {
    --bg: #f5f7f8;
    --surface: #ffffff;
    --surface-soft: #f8fafb;

    --text: #182126;
    --muted: #748087;
    --border: #e2e7e9;

    --primary: #306778;
    --primary-dark: #245362;
    --primary-soft: #eaf2f4;

    --danger: #b42318;
    --danger-soft: #fff1f0;

    --shadow: 0 10px 35px rgba(20, 35, 40, 0.06);
}

html {
    scroll-behavior: smooth;
}

body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family:
        Inter,
        Arial,
        sans-serif;
}

button,
input,
textarea,
select {
    font: inherit;
}

button {
    cursor: pointer;
}

.hidden {
    display: none !important;
}


/* =========================
   LOGIN
========================= */

#login {
    min-height: 100vh;

    display: flex;
    align-items: center;
    justify-content: center;

    padding: 24px;

    background:
        radial-gradient(
            circle at top right,
            #dcecef,
            transparent 40%
        ),
        var(--bg);
}

.login-box {
    width: 100%;
    max-width: 400px;

    background: var(--surface);

    padding: 36px;

    border: 1px solid var(--border);
    border-radius: 20px;

    box-shadow: var(--shadow);
}

.login-logo {
    width: 46px;
    height: 46px;

    display: flex;
    align-items: center;
    justify-content: center;

    margin-bottom: 20px;

    background: var(--primary);

    color: white;

    border-radius: 13px;

    font-weight: 800;
    font-size: 18px;
}

.login-box h1 {
    margin: 0 0 6px;

    font-size: 27px;
}

.login-box p {
    margin: 0 0 24px;

    color: var(--muted);
}

.login-box input {
    width: 100%;

    padding: 13px 14px;

    margin-top: 10px;

    border: 1px solid var(--border);
    border-radius: 10px;

    background: var(--surface-soft);

    outline: none;

    transition:
        border 0.2s ease,
        box-shadow 0.2s ease;
}

.login-box input:focus {
    border-color: var(--primary);

    box-shadow:
        0 0 0 3px rgba(48, 103, 120, 0.12);
}

.primary {
    border: 0;

    background: var(--primary);
    color: white;

    border-radius: 10px;

    padding: 11px 16px;

    font-weight: 700;

    transition:
        background 0.2s ease,
        transform 0.15s ease;
}

.primary:hover {
    background: var(--primary-dark);
}

.primary:active {
    transform: scale(0.98);
}

.login-box .primary {
    width: 100%;

    margin-top: 14px;
}

#error {
    margin-top: 14px;

    color: var(--danger);

    font-size: 14px;
}


/* =========================
   APP LAYOUT
========================= */

#app {
    min-height: 100vh;

    display: flex;
}


/* =========================
   SIDEBAR
========================= */

.sidebar {
    width: 250px;

    position: fixed;

    top: 0;
    left: 0;
    bottom: 0;

    display: flex;
    flex-direction: column;

    padding: 20px 14px;

    background: #182126;

    color: white;

    z-index: 20;
}

.brand {
    display: flex;
    align-items: center;

    gap: 11px;

    padding: 8px 10px 28px;
}

.brand-icon {
    width: 38px;
    height: 38px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 11px;

    background: var(--primary);

    font-weight: 800;
}

.brand-text {
    font-size: 17px;
    font-weight: 750;
}

.brand-text span {
    display: block;

    margin-top: 2px;

    color: #9da8ad;

    font-size: 11px;
    font-weight: 500;
}

.sidebar-nav {
    display: flex;
    flex-direction: column;

    gap: 5px;
}

.nav-button {
    width: 100%;

    display: flex;
    align-items: center;

    gap: 11px;

    padding: 11px 12px;

    border: 0;
    border-radius: 10px;

    background: transparent;

    color: #b6c0c4;

    text-align: left;
}

.nav-button:hover {
    background: rgba(255,255,255,0.06);

    color: white;
}

.nav-button.active {
    background: var(--primary);

    color: white;
}

.sidebar-bottom {
    margin-top: auto;
}

.logout {
    width: 100%;

    padding: 11px 12px;

    border: 0;
    border-radius: 10px;

    background: rgba(255,255,255,0.06);

    color: #d5dcdf;

    text-align: left;
}

.logout:hover {
    background: rgba(255,255,255,0.1);
}


/* =========================
   MAIN
========================= */

.dashboard {
    width: 100%;

    margin-left: 250px;

    min-height: 100vh;
}

.dashboard-header {
    height: 72px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    padding: 0 34px;

    background: rgba(255,255,255,0.9);

    border-bottom: 1px solid var(--border);

    position: sticky;
    top: 0;

    backdrop-filter: blur(12px);

    z-index: 10;
}

.header-title {
    font-size: 15px;

    font-weight: 700;
}

.admin-status {
    display: flex;
    align-items: center;

    gap: 8px;

    color: var(--muted);

    font-size: 13px;
}

.status-dot {
    width: 8px;
    height: 8px;

    border-radius: 50%;

    background: #42a06b;
}

main {
    max-width: 1400px;

    margin: auto;

    padding: 36px;
}


/* =========================
   PAGE HEADER
========================= */

.page-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;

    gap: 20px;

    margin-bottom: 28px;
}

.page-header h2 {
    margin: 0;

    font-size: 30px;

    letter-spacing: -0.7px;
}

.page-header p {
    margin: 7px 0 0;

    color: var(--muted);
}


/* =========================
   VIEWS
========================= */

.view {
    display: none;
}

.view.active {
    display: block;
}


/* =========================
   STATS
========================= */

.stats-grid {
    display: grid;

    grid-template-columns:
        repeat(4, 1fr);

    gap: 16px;

    margin-bottom: 28px;
}

.stat-card {
    background: var(--surface);

    padding: 20px;

    border: 1px solid var(--border);
    border-radius: 16px;

    box-shadow:
        0 4px 15px rgba(0,0,0,0.02);
}

.stat-label {
    color: var(--muted);

    font-size: 13px;
}

.stat-value {
    margin-top: 8px;

    font-size: 27px;
    font-weight: 750;
}


/* =========================
   SECTION CARD
========================= */

.section-card {
    background: var(--surface);

    border: 1px solid var(--border);
    border-radius: 16px;

    padding: 24px;

    box-shadow:
        0 5px 18px rgba(0,0,0,0.025);
}


/* =========================
   EXAMPLES
========================= */

.example-editor {
    background: var(--surface);

    border: 1px solid var(--border);
    border-radius: 16px;

    padding: 24px;

    margin-bottom: 24px;
}

.grid {
    display: grid;

    grid-template-columns:
        1fr 1fr;

    gap: 16px;
}

.field.full {
    grid-column: 1 / -1;
}

.field label {
    display: block;

    margin-bottom: 7px;

    font-size: 13px;

    font-weight: 650;

    color: #526066;
}

.field input,
.field textarea,
.controls input,
.controls select,
.request-status-select {
    width: 100%;

    padding: 11px 12px;

    border: 1px solid var(--border);
    border-radius: 9px;

    background: var(--surface-soft);

    color: var(--text);

    outline: none;
}

.field textarea {
    min-height: 110px;

    resize: vertical;
}

.field input:focus,
.field textarea:focus,
.controls input:focus,
.controls select:focus {
    border-color: var(--primary);

    box-shadow:
        0 0 0 3px rgba(48,103,120,0.1);
}

.save-row {
    display: flex;
    justify-content: flex-end;

    margin-top: 18px;
}

#example-list {
    display: grid;

    grid-template-columns:
        repeat(3, 1fr);

    gap: 18px;
}

.example {
    background: var(--surface);

    border: 1px solid var(--border);
    border-radius: 15px;

    overflow: hidden;

    transition:
        transform 0.2s ease,
        box-shadow 0.2s ease;
}

.example:hover {
    transform: translateY(-3px);

    box-shadow: var(--shadow);
}

.example img {
    width: 100%;
    height: 210px;

    object-fit: contain;

    background: #f3f5f6;

    display: block;
}

.example-content {
    padding: 17px;
}

.example h3 {
    margin: 0 0 7px;

    font-size: 16px;
}

.example p {
    margin: 0 0 16px;

    color: var(--muted);

    line-height: 1.5;

    font-size: 14px;
}

.example-actions {
    display: flex;

    justify-content: flex-end;
}

.delete-example,
.delete-request {
    border: 1px solid #f0cfca;

    background: var(--danger-soft);

    color: var(--danger);

    border-radius: 9px;

    padding: 9px 13px;

    font-weight: 650;
}


/* =========================
   REQUESTS
========================= */

.request-toolbar {
    display: flex;

    gap: 10px;

    margin-bottom: 20px;
}

.controls {
    display: flex;

    gap: 10px;

    width: 100%;
}

.controls input {
    flex: 1;
}

.controls select {
    width: 180px;
}

#requests {
    display: grid;

    gap: 15px;
}

.request-card {
    background: var(--surface);

    border: 1px solid var(--border);
    border-radius: 16px;

    overflow: hidden;

    transition:
        box-shadow 0.2s ease,
        transform 0.2s ease;
}

.request-card:hover {
    box-shadow: var(--shadow);
}

.request-header {
    padding: 18px 21px;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 20px;

    border-bottom: 1px solid var(--border);
}

.request-code {
    margin-bottom: 5px;

    font-size: 16px;
    font-weight: 750;
}

.request-name {
    color: var(--muted);

    font-size: 13px;
}

.request-meta {
    display: flex;
    align-items: center;

    gap: 12px;
}

.request-date {
    color: var(--muted);

    font-size: 12px;
}

.request-status {
    padding: 6px 11px;

    border-radius: 999px;

    background: var(--primary-soft);

    color: var(--primary);

    font-size: 12px;
    font-weight: 750;
}

.request-content {
    padding: 21px;
}

.request-grid {
    display: grid;

    grid-template-columns:
        1fr 1fr;

    gap: 13px;
}

.request-field {
    background: var(--surface-soft);

    border: 1px solid #edf0f1;

    border-radius: 11px;

    padding: 13px;
}

.request-field.full {
    grid-column: 1 / -1;
}

.request-field-label {
    margin-bottom: 6px;

    color: var(--muted);

    font-size: 10px;
    font-weight: 750;

    text-transform: uppercase;

    letter-spacing: 0.07em;
}

.request-field-value {
    line-height: 1.5;

    word-break: break-word;
}

.request-description {
    white-space: pre-wrap;
}

.request-images {
    display: flex;
    flex-wrap: wrap;

    gap: 10px;

    margin-top: 8px;
}

.request-image {
    width: 160px;
    height: 120px;

    overflow: hidden;

    border: 1px solid var(--border);
    border-radius: 10px;

    background: #f3f5f6;
}

.request-image img {
    width: 100%;
    height: 100%;

    object-fit: contain;
}

.request-controls {
    display: flex;

    align-items: center;
    justify-content: space-between;

    gap: 15px;

    margin-top: 22px;
    padding-top: 18px;

    border-top: 1px solid var(--border);
}


/* =========================
   FILES / UPDATES
========================= */

.file-list,
.update-files {
    display: flex;

    flex-wrap: wrap;

    gap: 8px;
}

.file {
    padding: 8px 11px;

    background: var(--surface-soft);

    border: 1px solid var(--border);
    border-radius: 8px;
}

.file a,
.update-files a {
    color: var(--primary);

    text-decoration: none;
}

.update {
    margin-top: 10px;

    padding: 15px;

    background: var(--surface-soft);

    border: 1px solid var(--border);
    border-radius: 11px;
}

.update-header {
    display: flex;

    justify-content: space-between;

    gap: 10px;

    margin-bottom: 8px;
}

.author {
    font-weight: 700;
}

.date {
    color: var(--muted);

    font-size: 12px;
}

.message {
    white-space: pre-wrap;

    line-height: 1.5;
}

.new-update {
    margin-top: 15px;
}

.new-message {
    width: 100%;

    min-height: 110px;

    padding: 12px;

    border: 1px solid var(--border);
    border-radius: 9px;

    resize: vertical;
}

.update-actions {
    display: flex;

    justify-content: space-between;
    align-items: center;

    gap: 10px;

    margin-top: 10px;
}

.file-button {
    display: inline-block;

    padding: 10px 13px;

    border: 1px solid var(--border);
    border-radius: 9px;

    background: var(--surface-soft);
}

.file-button input {
    display: none;
}


/* =========================
   TOAST
========================= */

#toast {
    position: fixed;

    right: 24px;
    bottom: 24px;

    padding: 13px 17px;

    border-radius: 10px;

    background: #182126;

    color: white;

    opacity: 0;

    transform: translateY(10px);

    pointer-events: none;

    transition:
        opacity 0.25s ease,
        transform 0.25s ease;

    z-index: 100;
}

#toast.show {
    opacity: 1;

    transform: translateY(0);
}


/* =========================
   MOBILE
========================= */

@media (max-width: 1100px) {

    .stats-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    #example-list {
        grid-template-columns: repeat(2, 1fr);
    }

}

@media (max-width: 750px) {

    .sidebar {
        width: 72px;

        padding: 18px 10px;
    }

    .brand {
        justify-content: center;

        padding-bottom: 25px;
    }

    .brand-text,
    .nav-button span,
    .logout span {
        display: none;
    }

    .nav-button,
    .logout {
        display: flex;

        justify-content: center;
    }

    .dashboard {
        margin-left: 72px;
    }

    .dashboard-header {
        padding: 0 20px;
    }

    main {
        padding: 24px 18px;
    }

    .page-header {
        display: block;
    }

    .request-toolbar,
    .controls {
        flex-direction: column;
    }

    .controls select {
        width: 100%;
    }

    .request-header {
        align-items: flex-start;

        flex-direction: column;
    }

    .request-meta {
        width: 100%;

        justify-content: space-between;
    }

    .request-grid,
    .grid {
        grid-template-columns: 1fr;
    }

    .field.full,
    .request-field.full {
        grid-column: auto;
    }

}

@media (max-width: 500px) {

    .stats-grid {
        grid-template-columns: 1fr;
    }

    #example-list {
        grid-template-columns: 1fr;
    }

    .request-controls,
    .update-actions {
        flex-direction: column;

        align-items: stretch;
    }

    .request-status-select,
    .delete-request {
        width: 100%;
    }

}

/* Request card interaction and edit/update controls */
.request-header { width: 100%; border: 0; background: var(--surface); text-align: left; cursor: pointer; }
.request-header:hover { background: #fbfcfc; }
.request-identity { min-width: 0; display: grid; gap: 3px; }
.request-code-label { color: var(--muted); font-size: 10px; font-weight: 750; text-transform: uppercase; letter-spacing: .08em; }
.request-code { display: inline-flex; width: fit-content; padding: 4px 8px; border-radius: 6px; background: var(--primary-soft); color: var(--primary); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; letter-spacing: .03em; }
.request-toggle { color: var(--primary); font-size: 12px; font-weight: 700; }
.request-card .request-content { display: none; }
.request-card.open .request-content { display: block; }
.request-edit-form input, .request-edit-form textarea, .request-edit-form select { width: 100%; border: 1px solid var(--border); border-radius: 8px; background: #fff; color: var(--text); padding: 10px 11px; }
.request-edit-form textarea { min-height: 110px; resize: vertical; }
.request-updates-section { margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--border); }
.updates-title { margin: 0 0 12px; font-size: 15px; }
.new-update { margin-top: 14px; }
.delete-request { border: 1px solid #f0cfca; background: var(--danger-soft); color: var(--danger); border-radius: 9px; padding: 9px 13px; font-weight: 650; }
@media (max-width: 750px) { .request-meta { flex-wrap: wrap; } .request-toggle { width: 100%; } }
</style>
</head>


<body>


<!-- LOGIN -->

<div id="login">

    <div class="login-box">

        <div class="login-logo">
            K
        </div>

        <h1>Kxko Admin</h1>

        <p>
            Sign in to manage your website.
        </p>

        <input
            id="admin-email"
            type="email"
            placeholder="Email"
        >

        <input
            id="admin-password"
            type="password"
            placeholder="Password"
        >

        <button
            id="login-button"
            class="primary"
            type="button"
        >
            Sign In
        </button>

        <div id="error"></div>

    </div>

</div>


<!-- APP -->

<div id="app" class="hidden">


    <!-- SIDEBAR -->

    <aside class="sidebar">

        <div class="brand">

            <div class="brand-icon">
                K
            </div>

            <div class="brand-text">

                Kxko Admin

                <span>
                    Dashboard
                </span>

            </div>

        </div>


        <nav class="sidebar-nav">

            <button
                class="nav-button active"
                data-view="overview"
                type="button"
            >
                📊
                <span>Overview</span>
            </button>


            <button
                class="nav-button"
                data-view="requests"
                type="button"
            >
                📬
                <span>Requests</span>
            </button>


            <button
                class="nav-button"
                data-view="examples"
                type="button"
            >
                🖼️
                <span>Examples</span>
            </button>

        </nav>


        <div class="sidebar-bottom">

            <button
                id="logout-button"
                class="logout"
                type="button"
            >
                ↪
                <span>Log out</span>
            </button>

        </div>

    </aside>


    <!-- DASHBOARD -->

    <div class="dashboard">


        <header class="dashboard-header">

            <div class="header-title">
                Kxko Admin Panel
            </div>

            <div class="admin-status">

                <div class="status-dot"></div>

                Connected

            </div>

        </header>


        <main>


            <!-- OVERVIEW -->

            <section
                id="overview-view"
                class="view active"
            >

                <div class="page-header">

                    <div>

                        <h2>
                            Overview
                        </h2>

                        <p>
                            A quick look at your website activity.
                        </p>

                    </div>

                </div>


                <div class="stats-grid">

                    <div class="stat-card">

                        <div class="stat-label">
                            Total Requests
                        </div>

                        <div
                            class="stat-value"
                            id="stat-total-requests"
                        >
                            —
                        </div>

                    </div>


                    <div class="stat-card">

                        <div class="stat-label">
                            Pending
                        </div>

                        <div
                            class="stat-value"
                            id="stat-pending"
                        >
                            —
                        </div>

                    </div>


                    <div class="stat-card">

                        <div class="stat-label">
                            In Progress
                        </div>

                        <div
                            class="stat-value"
                            id="stat-progress"
                        >
                            —
                        </div>

                    </div>


                    <div class="stat-card">

                        <div class="stat-label">
                            Completed
                        </div>

                        <div
                            class="stat-value"
                            id="stat-completed"
                        >
                            —
                        </div>

                    </div>

                </div>


                <div class="section-card">

                    <h3>
                        Quick actions
                    </h3>

                    <p style="color: var(--muted); margin-bottom: 18px;">
                        Jump straight to the things you need to manage.
                    </p>

                    <button
                        class="primary"
                        onclick="showAdminView('requests')"
                    >
                        Manage Requests
                    </button>

                    <button
                        class="nav-button"
                        style="
                            display:inline-flex;
                            color:var(--text);
                            margin-left:8px;
                            background:#f3f5f6;
                            width:auto;
                        "
                        onclick="showAdminView('examples')"
                    >
                        Manage Examples
                    </button>

                </div>

            </section>


            <!-- REQUESTS -->

            <section
                id="requests-view"
                class="view"
            >

                <div class="page-header">

                    <div>

                        <h2>
                            Requests
                        </h2>

                        <p>
                            Manage customer requests, files and updates.
                        </p>

                    </div>

                </div>


                <div class="request-toolbar">

                    <div class="controls">

                        <input
                            id="search"
                            type="text"
                            placeholder="Search requests..."
                        >

                        <select id="filter">

                            <option value="all">
                                All statuses
                            </option>

                            <option value="Pending">
                                Pending
                            </option>

                            <option value="Accepted">
                                Accepted
                            </option>

                            <option value="In Progress">
                                In Progress
                            </option>

                            <option value="Completed">
                                Completed
                            </option>

                            <option value="Cancelled">
                                Cancelled
                            </option>

                        </select>

                    </div>

                </div>


                <div id="requests"></div>

            </section>


            <!-- EXAMPLES -->

            <section
                id="examples-view"
                class="view"
            >

                <div class="page-header">

                    <div>

                        <h2>
                            Examples
                        </h2>

                        <p>
                            Manage the diagrams shown on your website.
                        </p>

                    </div>

                </div>


                <div class="example-editor">

                    <div class="grid">


                        <div class="field">

                            <label>
                                Diagram title
                            </label>

                            <input
                                id="example-title"
                                placeholder="Diagram title"
                            >

                        </div>


                        <div class="field">

                            <label>
                                Image
                            </label>

                            <input
                                id="example-image"
                                type="file"
                                accept="image/*"
                            >

                        </div>


                        <div class="field full">

                            <label>
                                Description
                            </label>

                            <textarea
                                id="example-description"
                                placeholder="Description..."
                            ></textarea>

                        </div>

                    </div>


                    <div class="save-row">

                        <button
                            id="add-example"
                            class="primary"
                            type="button"
                        >
                            Add Example
                        </button>

                    </div>

                </div>


                <div id="example-list">

                    <p>
                        Loading examples...
                    </p>

                </div>

            </section>


        </main>

    </div>

</div>


<div id="toast"></div>


<script src="../js/admin.js"></script>

<script src="../js/requests-admin.js"></script>


<script>

/* =========================
   NAVIGATION
========================= */

function showAdminView(view) {

    document
        .querySelectorAll(".view")
        .forEach(element => {

            element.classList.remove("active");

        });


    document
        .getElementById(view + "-view")
        ?.classList.add("active");


    document
        .querySelectorAll(".nav-button")
        .forEach(button => {

            button.classList.remove("active");

        });


    document
        .querySelector(
            `.nav-button[data-view="${view}"]`
        )
        ?.classList.add("active");

}


/* NAV BUTTONS */

document
    .querySelectorAll(".nav-button[data-view]")
    .forEach(button => {

        button.addEventListener("click", () => {

            showAdminView(
                button.dataset.view
            );

        });

    });

</script>

</body>
</html>

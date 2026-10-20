const STATUS_LABELS = {
  pending: "Received — waiting for review",
  accepted: "Accepted — waiting to start",
  "in progress": "In progress",
  completed: "Completed",
  done: "Completed",
  answered: "Answered",
  closed: "Closed",
  cancelled: "Cancelled",
};


/* Only http(s) links are clickable (file links come from the database). */
function safeLink(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

function formatStatusDate(value) {
  const date = value ? new Date(value) : null;
  return date && !isNaN(date) ? date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "";
}

function statusBlock(title) {
  const box = document.createElement("div");
  box.className = "status-block";
  const heading = document.createElement("p");
  heading.className = "status-block-title";
  heading.textContent = title;
  box.append(heading);
  return box;
}

/* Updates the owner posted on this request, oldest first. updates === null means loading failed. */
function renderUpdates(updates) {
  const box = statusBlock("Updates");
  if (updates === null) {
    box.append(Object.assign(document.createElement("p"), { className: "small muted", textContent: "Updates are unavailable right now. Please try again later." }));
    return box;
  }
  if (!updates.length) {
    box.append(Object.assign(document.createElement("p"), { className: "small muted", textContent: "No updates yet. You will see them here as soon as there is news." }));
    return box;
  }
  for (const update of updates) {
    const item = document.createElement("div");
    item.className = "status-update";
    const head = document.createElement("p");
    head.className = "status-update-head";
    head.textContent = [update.author || "Kxko", formatStatusDate(update.created_at)].filter(Boolean).join(" · ");
    const message = document.createElement("p");
    message.className = "status-update-text";
    message.textContent = update.message || "";
    item.append(head, message);
    for (const file of update.request_update_files || []) {
      const href = safeLink(file.file_url);
      if (!href) continue;
      const link = document.createElement("a");
      link.href = href; link.target = "_blank"; link.rel = "noopener";
      link.className = "status-update-file";
      link.textContent = `Download ${file.file_name || "file"}`;
      item.append(link);
    }
    box.append(item);
  }
  return box;
}

/* The question and, once answered, the answer. */
function renderAnswer(row) {
  const box = statusBlock("Your question");
  box.append(Object.assign(document.createElement("p"), { className: "status-update-text", textContent: row.question || "" }));
  const answerTitle = document.createElement("p");
  answerTitle.className = "status-block-title";
  answerTitle.textContent = row.answer ? `Answer${row.answered_at ? ` · ${formatStatusDate(row.answered_at)}` : ""}` : "Answer";
  const answer = document.createElement("p");
  answer.className = row.answer ? "status-update-text" : "small muted";
  answer.textContent = row.answer || "Not answered yet. Check back soon with the same code.";
  box.append(answerTitle, answer);
  return box;
}

document.getElementById("status-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const msg = document.getElementById("status-msg");
  const result = document.getElementById("status-result");
  const code = document.getElementById("status-code").value.trim().toUpperCase();
  msg.classList.add("hidden");
  result.classList.add("hidden");

  const showMessage = (text) => {
    msg.textContent = text;
    msg.classList.remove("hidden");
  };
  let row;
  let type;

  try {
    if (code.startsWith("KXQ-")) {
      const response = await db.rpc("get_question_status", { p_code: code });
      if (response.error) throw response.error;
      row = response.data;
      type = "question";
    } else if (code.startsWith("KXKO-")) {
      const response = await db.rpc("get_request_status", { p_code: code });
      if (response.error) throw response.error;
      row = response.data;
      type = "request";
    } else {
      showMessage("Enter a request code (KXKO-…) or question code (KXQ-…).");
      return;
    }
  } catch (error) {
    console.error("Could not check status:", error);
    showMessage("Status is unavailable right now. Please try again later.");
    return;
  }

  if (!row) {
    showMessage("Nothing found with that code.");
    return;
  }

  const updates = type === "request" ? (Array.isArray(row.updates) ? row.updates : []) : [];

  const codeBadge = document.createElement("p");
  codeBadge.className = "code-badge";
  codeBadge.textContent = row.request_code || row.question_code;
  const status = document.createElement("p");
  status.className = "mono small moss";
  status.textContent = STATUS_LABELS[String(row.status || "").toLowerCase()] || row.status || "Received";
  const meta = document.createElement("p");
  meta.className = "mono small muted";
  meta.textContent = type === "request"
    ? `${row.type || "Diagram"} · ${row.size || "Custom size"}${row.created_at ? ` · submitted ${new Date(row.created_at).toLocaleDateString()}` : ""}`
    : `Question${row.created_at ? ` · sent ${new Date(row.created_at).toLocaleDateString()}` : ""}`;
  const parts = [codeBadge, status, meta];

  if (type === "request") {
    parts.push(renderUpdates(updates));
  } else {
    parts.push(renderAnswer(row));
  }
  result.replaceChildren(...parts);
  result.classList.remove("hidden");
});

document.getElementById("status-code")?.addEventListener("input", (event) => {
  event.currentTarget.value = event.currentTarget.value.toUpperCase();
});

/* "Check now" buttons next to a freshly shown code: fill the status box, look it up and scroll to it. */
document.addEventListener("click", (event) => {
  const button = event.target.closest(".check-now-btn");
  if (!button) return;
  const code = (document.getElementById(button.dataset.codeFrom)?.textContent || "").trim();
  const input = document.getElementById("status-code");
  const form = document.getElementById("status-form");
  if (!code || !input || !form) return;
  input.value = code.toUpperCase();
  document.getElementById("status")?.scrollIntoView({ behavior: "smooth", block: "start" });
  form.requestSubmit();
});

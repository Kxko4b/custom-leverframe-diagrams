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
      const response = await db.from("questions")
        .select("question_code, status, created_at")
        .eq("question_code", code)
        .maybeSingle();
      if (response.error) throw response.error;
      row = response.data;
      type = "question";
    } else if (code.startsWith("KXKO-")) {
      const response = await db.from("requests")
        .select("request_code, status, type, size, created_at")
        .eq("request_code", code)
        .maybeSingle();
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
  result.replaceChildren(codeBadge, status, meta);
  result.classList.remove("hidden");
});

document.getElementById("status-code")?.addEventListener("input", (event) => {
  event.currentTarget.value = event.currentTarget.value.toUpperCase();
});

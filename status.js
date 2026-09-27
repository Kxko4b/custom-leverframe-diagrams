// Kxko — status lookup by tracking code (works for requests and questions)
const FRIENDLY_STATUS = {
  submitted: "Submitted — waiting to be accepted",
  accepted: "Accepted — in the queue",
  "in progress": "In progress",
  done: "Done",
  cancelled: "Cancelled",
  sent: "Sent — waiting for an answer",
  answered: "Answered",
};

document.getElementById("status-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const msg = document.getElementById("status-msg");
  const result = document.getElementById("status-result");
  const raw = document.getElementById("status-code").value.trim().toUpperCase();
  if (!raw) return;

  msg.classList.add("hidden");
  result.classList.add("hidden");

  // Requests first, then questions
  let row = null;
  let kind = null;
  const req = await db
    .from("requests")
    .select("code, status, type, tier, created_at")
    .eq("code", raw)
    .maybeSingle();
  if (req.data) {
    row = req.data;
    kind = "request";
  } else {
    const q = await db
      .from("questions")
      .select("code, status, created_at")
      .eq("code", raw)
      .maybeSingle();
    if (q.data) {
      row = q.data;
      kind = "question";
    }
  }

  if (!row) {
    msg.textContent = "Nothing found with that code.";
    msg.classList.remove("hidden");
    return;
  }

  const meta = document.createElement("p");
  meta.className = "mono small muted";
  meta.textContent =
    kind === "request"
      ? `${row.type} · ${row.tier} · submitted ${new Date(row.created_at).toLocaleDateString()}`
      : `Question · sent ${new Date(row.created_at).toLocaleDateString()}`;

  const badge = document.createElement("p");
  badge.className = "code-badge";
  badge.textContent = row.code;

  const line = document.createElement("p");
  line.className = "mono small moss";
  line.textContent = FRIENDLY_STATUS[row.status] || row.status;

  result.replaceChildren(badge, line, meta);
  result.classList.remove("hidden");
});

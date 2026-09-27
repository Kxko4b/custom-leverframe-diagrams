function generateRequestCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = new Uint32Array(8);
  crypto.getRandomValues(random);
  const part = Array.from(random, (value) => alphabet[value % alphabet.length]).join("");
  return `KXKO-${part.slice(0, 4)}-${part.slice(4)}`;
}

document.getElementById("request-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('[type="submit"]');
  const msg = document.getElementById("request-msg");
  const showMessage = (text, isError = false) => {
    msg.textContent = text;
    msg.classList.remove("hidden", "error", "moss");
    msg.classList.add(isError ? "error" : "moss");
  };

  button.disabled = true;
  showMessage("Sending your request…");
  const tier = form.querySelector('input[name="tier"]:checked')?.value || "custom";
  const values = {
    name: document.getElementById("req-name").value.trim().slice(0, 80),
    discord: document.getElementById("req-discord").value.trim().slice(0, 120) || null,
    email: document.getElementById("req-email").value.trim().slice(0, 120) || null,
    size: tier,
    type: document.getElementById("req-type").value,
    description: document.getElementById("req-description").value.trim().slice(0, 2000),
    status: "Pending",
  };

  let requestCode = null;
  let error = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    requestCode = generateRequestCode();
    ({ error } = await db.from("requests").insert({ ...values, request_code: requestCode }));
    if (!error) break;
    if (error.code !== "23505") break;
  }
  button.disabled = false;

  if (error || !requestCode) {
    console.error("Could not submit request:", error);
    showMessage("Could not send your request. Please try again.", true);
    return;
  }

  msg.classList.add("hidden");
  form.reset();
  form.classList.add("hidden");
  document.getElementById("request-code").textContent = requestCode;
  document.getElementById("request-done").classList.remove("hidden");
});

document.getElementById("request-again")?.addEventListener("click", () => {
  const form = document.getElementById("request-form");
  form.reset();
  form.classList.remove("hidden");
  document.getElementById("request-done").classList.add("hidden");
});

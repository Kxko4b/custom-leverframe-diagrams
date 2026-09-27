// Kxko — diagram request form
document.getElementById("request-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const msg = document.getElementById("request-msg");
  const show = (text) => {
    msg.textContent = text;
    msg.classList.remove("hidden");
  };

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  show("Sending…");

  const tier = form.querySelector('input[name="tier"]:checked')?.value || "custom";
  const code = await insertWithCode("requests", (c) => ({
    code: c,
    name: document.getElementById("req-name").value.trim().slice(0, 80),
    email: document.getElementById("req-email").value.trim().slice(0, 120) || null,
    tier,
    type: document.getElementById("req-type").value,
    description: document.getElementById("req-description").value.trim().slice(0, 2000),
  }));
  button.disabled = false;

  if (!code) {
    show("Could not send your request — please try again.");
    return;
  }

  msg.classList.add("hidden");
  form.classList.add("hidden");
  document.getElementById("request-code").textContent = code;
  document.getElementById("request-done").classList.remove("hidden");
});

// Send another request: back to a clean form
document.getElementById("request-again")?.addEventListener("click", () => {
  const form = document.getElementById("request-form");
  form.reset();
  form.classList.remove("hidden");
  document.getElementById("request-done").classList.add("hidden");
});

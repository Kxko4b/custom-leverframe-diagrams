// Kxko — question form
document.getElementById("question-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const msg = document.getElementById("question-msg");
  const show = (text) => {
    msg.textContent = text;
    msg.classList.remove("hidden");
  };

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  show("Sending…");

  const code = await insertWithCode("questions", (c) => ({
    code: c,
    question: document.getElementById("question-text").value.trim().slice(0, 1000),
    contact: document.getElementById("question-contact").value.trim().slice(0, 120) || null,
  }));
  button.disabled = false;

  if (!code) {
    show("Could not send your question — please try again.");
    return;
  }

  msg.classList.add("hidden");
  document.getElementById("question-code").textContent = code;
  document.getElementById("question-done").classList.remove("hidden");
});

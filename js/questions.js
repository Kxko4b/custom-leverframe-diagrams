function generateQuestionCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = new Uint32Array(8);
  crypto.getRandomValues(random);
  const part = Array.from(random, (value) => alphabet[value % alphabet.length]).join("");
  return `KXQ-${part.slice(0, 4)}-${part.slice(4)}`;
}

document.getElementById("question-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('[type="submit"]');
  const msg = document.getElementById("question-msg");
  const showMessage = (text, isError = false) => {
    msg.textContent = text;
    msg.classList.remove("hidden", "error", "moss");
    msg.classList.add(isError ? "error" : "moss");
  };

  button.disabled = true;
  showMessage("Sending your question…");
  const values = {
    question: document.getElementById("question-text").value.trim().slice(0, 1000),
    contact: document.getElementById("question-contact").value.trim().slice(0, 120) || null,
    status: "Pending",
  };

  let questionCode = null;
  let error = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    questionCode = generateQuestionCode();
    ({ error } = await db.from("questions").insert({ ...values, question_code: questionCode }));
    if (!error) break;
    if (error.code !== "23505") break;
  }
  button.disabled = false;

  if (error || !questionCode) {
    console.error("Could not submit question:", error);
    showMessage("Could not send your question. Please try again.", true);
    return;
  }

  form.reset();
  document.getElementById("question-code").textContent = questionCode;
  document.getElementById("question-done").classList.remove("hidden");
  showMessage("Your question has been sent.");
});

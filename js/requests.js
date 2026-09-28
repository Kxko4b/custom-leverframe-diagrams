function generateRequestCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = new Uint32Array(8);
  crypto.getRandomValues(random);
  const part = Array.from(random, (value) => alphabet[value % alphabet.length]).join("");
  return `KXKO-${part.slice(0, 4)}-${part.slice(4)}`;
}

const REQUEST_IMAGE_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);
const MAX_REQUEST_IMAGES = 5;
const MAX_REQUEST_IMAGE_SIZE = 5 * 1024 * 1024;

function validateRequestImages(files) {
  if (files.length > MAX_REQUEST_IMAGES) {
    return `Please select no more than ${MAX_REQUEST_IMAGES} reference images.`;
  }

  if (files.some((file) => !REQUEST_IMAGE_TYPES.has(file.type))) {
    return "Reference images must be PNG, JPEG, or WebP files.";
  }

  if (files.some((file) => file.size > MAX_REQUEST_IMAGE_SIZE)) {
    return "Each reference image must be smaller than 5 MB.";
  }

  return null;
}

document.getElementById("request-form")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector('[type="submit"]');
  const msg = document.getElementById("request-msg");
  const imageFiles = Array.from(document.getElementById("request-images")?.files || []);
  const showMessage = (text, isError = false) => {
    msg.textContent = text;
    msg.classList.remove("hidden", "error", "moss");
    msg.classList.add(isError ? "error" : "moss");
  };

  const imageValidationError = validateRequestImages(imageFiles);
  if (imageValidationError) {
    showMessage(imageValidationError, true);
    return;
  }

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
  let request = null;
  let error = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    requestCode = generateRequestCode();
    ({ data: request, error } = await db
      .from("requests")
      .insert({ ...values, request_code: requestCode })
      .select("id")
      .single());
    if (!error) break;
    if (error.code !== "23505") break;
  }
  if (error || !requestCode) {
    button.disabled = false;
    console.error("Could not submit request:", error);
    showMessage("Could not send your request. Please try again.", true);
    return;
  }

  if (!request) {
    button.disabled = false;
    console.error("Submitted request did not return an ID.");
    showMessage("Your request was sent, but the reference images could not be uploaded.", true);
    return;
  }

  let imageUploadFailed = false;
  for (const file of imageFiles) {
    const extension = REQUEST_IMAGE_TYPES.get(file.type);
    const path = `requests/${request.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await db.storage
      .from("diagram-files")
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      imageUploadFailed = true;
      console.error("Could not upload request image:", uploadError);
      continue;
    }

    const imageUrl = db.storage.from("diagram-files").getPublicUrl(path).data.publicUrl;
    const { error: imageRecordError } = await db.from("request_images").insert({
      request_id: request.id,
      image_url: imageUrl,
    });

    if (imageRecordError) {
      imageUploadFailed = true;
      console.error("Could not save request image:", imageRecordError);
    }
  }

  button.disabled = false;
  const imageMessage = document.getElementById("request-image-msg");

  if (imageUploadFailed) {
    imageMessage.textContent = "Your request was sent, but one or more reference images could not be uploaded.";
    imageMessage.classList.remove("hidden");
  } else {
    msg.classList.add("hidden");
    imageMessage.classList.add("hidden");
  }
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
  document.getElementById("request-image-msg").classList.add("hidden");
});

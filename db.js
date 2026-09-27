// Kxko — shared database connection + small helpers
const SUPABASE_URL = "https://mgrnyfwhketpoktqvqxw.supabase.co";
const SUPABASE_KEY = "sb_publishable_w5C05P9tvebwfkvrQReORQ_7ejqCW23";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// Tracking code: KX- + 4 unambiguous characters
function makeCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let part = "";
  const values = crypto.getRandomValues(new Uint32Array(4));
  for (let i = 0; i < 4; i++) {
    part += chars.charAt((values[i] ?? 0) % chars.length);
  }
  return `KX-${part}`;
}

// Insert with a generated code; retries if the code happens to collide
async function insertWithCode(table, buildRow) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeCode();
    const { error } = await db.from(table).insert(buildRow(code));
    if (!error) return code;
    if (error.code !== "23505") return null; // real failure, stop
  }
  return null;
}

// Copy-code buttons: <button class="copy-btn" data-copy="element-id">
document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".copy-btn");
  if (!btn) return;
  const el = document.getElementById(btn.dataset.copy);
  if (!el) return;
  const value = el.textContent.trim();
  let ok = false;
  try {
    await navigator.clipboard.writeText(value);
    ok = true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    ok = document.execCommand("copy");
    ta.remove();
  }
  if (ok) {
    const original = btn.textContent;
    btn.textContent = "Copied!";
    setTimeout(() => (btn.textContent = original), 1500);
  }
});

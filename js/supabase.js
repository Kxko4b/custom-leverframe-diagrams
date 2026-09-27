const SUPABASE_URL = "https://ggewdpazpeoielbqrcgm.supabase.co";

const SUPABASE_KEY = "sb_publishable_RZYBKLqjC9UYLNdqlOKZCA_IFX-5Gvm";


const db = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

document.addEventListener("click", async (event) => {
    const button = event.target.closest(".copy-btn");
    if (!button) return;

    const target = document.getElementById(button.dataset.copy);
    const value = target?.textContent.trim();
    if (!value) return;

    try {
        await navigator.clipboard.writeText(value);
    } catch {
        const input = document.createElement("textarea");
        input.value = value;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.append(input);
        input.select();
        document.execCommand("copy");
        input.remove();
    }

    const original = button.textContent;
    button.textContent = "Copied!";
    window.setTimeout(() => { button.textContent = original; }, 1500);
});

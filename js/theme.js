const themeButtons = document.querySelectorAll("[data-theme-toggle]");

const savedTheme = localStorage.getItem("theme");
const prefersDarkTheme = window.matchMedia("(prefers-color-scheme: dark)").matches;

function applyTheme(theme) {
  const isDark = theme === "dark";

  document.body.classList.toggle("theme-dark", isDark);

  themeButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(isDark));
    button.setAttribute(
      "aria-label",
      isDark ? "Switch to light mode" : "Switch to dark mode"
    );
    button.querySelector("[aria-hidden]").textContent = isDark ? "☀" : "☾";
    button.querySelector(".theme-toggle-label").textContent = isDark
      ? "Light mode"
      : "Dark mode";
  });
}

applyTheme(savedTheme || (prefersDarkTheme ? "dark" : "light"));

themeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const theme = document.body.classList.contains("theme-dark")
      ? "light"
      : "dark";

    localStorage.setItem("theme", theme);
    applyTheme(theme);
  });
});

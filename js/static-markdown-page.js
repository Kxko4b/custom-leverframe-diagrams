const markdownSource = document.getElementById("markdown-source");
const markdownContent = document.getElementById("markdown-content");
if (markdownSource && markdownContent) {
  markdownContent.innerHTML = window.renderSiteMarkdown(markdownSource.value.trim());
}

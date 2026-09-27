// Small, safe Markdown renderer for copy entered in the admin editor.
// Supports headings, paragraphs, lists, emphasis, links and explicit line breaks.
window.renderSiteMarkdown = function renderSiteMarkdown(source) {
  const escaped = String(source || "")
    .replace(/\r\n?/g, "\n")
    .replace(/<br\s*\/?>|\/br/gi, "\n");

  const escapeHtml = (value) => value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);

  const inline = (value) => {
    let html = escapeHtml(value);
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    html = html.replace(/\*\*(.+?)\*\*|__(.+?)__/g, (_match, a, b) => `<strong>${a || b}</strong>`);
    html = html.replace(/\*(.+?)\*|_(.+?)_/g, (_match, a, b) => `<em>${a || b}</em>`);
    return html;
  };

  const lines = escaped.split("\n");
  const blocks = [];
  let paragraph = [];
  let listType = null;
  let listItems = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(`<p>${paragraph.map(inline).join("<br>")}</p>`);
      paragraph = [];
    }
  };
  const flushList = () => {
    if (listItems.length) {
      blocks.push(`<${listType}>${listItems.map((item) => `<li>${inline(item)}</li>`).join("")}</${listType}>`);
      listItems = [];
      listType = null;
    }
  };

  for (const line of lines) {
    const heading = line.match(/^\s*(#{1,6})\s+(.+?)\s*#*\s*$/);
    const unordered = line.match(/^\s*[-*+]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);

    if (!line.trim()) {
      flushParagraph();
      flushList();
    } else if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      blocks.push(`<h${level}>${inline(heading[2])}</h${level}>`);
    } else if (unordered || ordered) {
      flushParagraph();
      const nextType = unordered ? "ul" : "ol";
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      listItems.push((unordered || ordered)[1]);
    } else {
      flushList();
      paragraph.push(line);
    }
  }
  flushParagraph();
  flushList();
  return blocks.join("");
};

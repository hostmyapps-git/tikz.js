import { renderToSvg } from "./Tikz.js";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderElement(element) {
  const source = element.dataset.tikzSource || element.textContent || "";

  element.dataset.tikzSource = source;

  try {
    const svg = renderToSvg(source);
    element.innerHTML = svg;
    element.dataset.tikzRendered = "true";
    element.removeAttribute("data-tikz-error");
    return svg;
  } catch (error) {
    element.dataset.tikzRendered = "false";
    element.dataset.tikzError = error.message;
    element.innerHTML = '<div style="padding:12px;border:1px solid #d14343;background:#fff5f5;color:#7a1212;font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap;"><strong>Tikz render error</strong><br>' + escapeHtml(error.message) + '</div>';
    return null;
  }
}

function renderAll(root = document) {
  const elements = root.querySelectorAll(".tikz");
  for (const element of elements) {
    renderElement(element);
  }
}

export { renderElement, renderAll };

import { renderToSvg } from "./Tikz.js";
import { renderAll, renderElement } from "./TikzDom.js";

function startAutoRender() {
  if (typeof document === "undefined") {
    return;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      renderAll();
    }, { once: true });
    return;
  }

  renderAll();
}

const api = {
  renderToSvg,
  renderAll,
  renderElement
};

startAutoRender();

export { renderToSvg, renderAll, renderElement };
export default api;

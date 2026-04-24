import { parse } from "./TikzParser.js";
import { render } from "./TikzRenderer.js";

function renderToSvg(source, config = {}) {
  const ast = parse(source, config);
  return render(ast, config);
}

export { renderToSvg };

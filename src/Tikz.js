import { parse } from "./TikzParser.js";
import { render } from "./TikzRenderer.js";

function renderToSvg(source) {
  const ast = parse(source);
  return render(ast);
}

export { renderToSvg };

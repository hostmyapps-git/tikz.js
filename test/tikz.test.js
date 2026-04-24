import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "../src/TikzParser.js";
import { renderToSvg } from "../src/Tikz.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const examplesDirectory = path.join(__dirname, "..", "examples");

function readExample(name) {
  return fs.readFileSync(path.join(examplesDirectory, name), "utf8");
}

test("parses cubic curves and bidirectional arrows", () => {
  const source = readExample("curved-link.tikz");
  const ast = parse(source);
  const drawCommand = ast.commands[0];

  assert.equal(drawCommand.options["<->"], true);
  assert.equal(drawCommand.operations[1].type, "curve");
  assert.deepEqual(drawCommand.operations[1].controlOne, { x: 1, y: 1.6 });
  assert.deepEqual(drawCommand.operations[1].point, { x: 3, y: 0.2 });
});

test("parses orthogonal connectors into line segments", () => {
  const source = readExample("orthogonal-route.tikz");
  const ast = parse(source);
  const operations = ast.commands[0].operations;

  assert.equal(operations[1].type, "line");
  assert.deepEqual(operations[1].point, { x: 0, y: 1.4 });
  assert.deepEqual(operations[2].point, { x: 2, y: 1.4 });
  assert.deepEqual(operations[3].point, { x: 3.2, y: 1.4 });
  assert.deepEqual(operations[4].point, { x: 3.2, y: 0.4 });
});

test("parses directional node anchors", () => {
  const source = readExample("rectangle-marker.tikz");
  const ast = parse(source);
  const nodeCommand = ast.commands[2];

  assert.deepEqual(nodeCommand.anchor, ["below"]);
  assert.deepEqual(nodeCommand.point, { x: 1.5, y: 0 });
});

test("renders curve arrows with marker definitions", () => {
  const svg = renderToSvg(readExample("curved-link.tikz"));

  assert.match(svg, /marker-end=/);
  assert.match(svg, /marker-start=/);
  assert.match(svg, /<defs>/);
  assert.match(svg, /C /);
});

test("renders directional node anchors with text alignment", () => {
  const svg = renderToSvg(readExample("orthogonal-route.tikz"));

  assert.match(svg, /text-anchor="start"/);
  assert.match(svg, /dominant-baseline="middle"/);
});

test("renders orthogonal connectors as svg lines", () => {
  const svg = renderToSvg(readExample("orthogonal-route.tikz"));

  assert.match(svg, /L /);
  assert.match(svg, /marker-end=/);
});

test("expands output bounds enough for arrow markers and labels", () => {
  const svg = renderToSvg(readExample("curved-link.tikz"));
  const viewBoxMatch = svg.match(/viewBox="([0-9.-]+) ([0-9.-]+) ([0-9.]+) ([0-9.]+)"/);

  assert.ok(viewBoxMatch);
  assert.ok(Number(viewBoxMatch[3]) > 110);
  assert.ok(Number(viewBoxMatch[4]) > 60);
});

test("rejects unsupported shorthand curve syntax", () => {
  const source = String.raw`\begin{tikzpicture}
  \draw (0,0) .. (1,1);
\end{tikzpicture}`;

  assert.throws(() => parse(source), /curves must use/);
});

test("keeps scope environments out of the stable profile", () => {
  const source = String.raw`\begin{tikzpicture}
  \begin{scope}[draw=red]
    \draw (0,0) -- (1,1);
  \end{scope}
\end{tikzpicture}`;

  assert.throws(() => parse(source), /unsupported command '\\begin\{scope\}\[draw=red\]'|scope environments are not supported/);
});

test("renders origin-centered circles and basic to-label edges", () => {
  const source = String.raw`\begin{tikzpicture}
\draw circle(0.5);
\draw (-0.5,0) to ["text"] (0.5,0);
\end{tikzpicture}`;

  const ast = parse(source);
  assert.deepEqual(ast.commands[0].operations[0].point, { x: 0, y: 0 });
  assert.equal(ast.commands[0].operations[1].type, "ellipse");
  assert.equal(ast.commands[1].operations[1].label, "text");

  const svg = renderToSvg(source);
  assert.match(svg, /<path d="M .* L .*" stroke="currentColor" fill="none" stroke-width="0\.55"/);
  assert.match(svg, /fill="none"/);
  assert.match(svg, /<tspan>text<\/tspan>/);
});

test("renders grid paths with thin dotted styling", () => {
  const source = String.raw`\begin{tikzpicture}
  \draw[thin,dotted] (-3,-3) grid (3,3);
  \draw[->] (-3,0) -- (3,0);
  \draw[->] (0,-3) -- (0,3);
\end{tikzpicture}`;

  const ast = parse(source);
  assert.equal(ast.commands[0].operations[1].type, "grid");

  const svg = renderToSvg(source);
  assert.match(svg, /stroke-dasharray="1 6"/);
  assert.match(svg, /marker-end=/);
  assert.match(svg, /M .* L .* M .* L /);
});

test("renders axis example with foreach labels and inline nodes", () => {
  const source = String.raw`\begin{tikzpicture}[every node/.style={font=\sffamily\small}]
  \draw[thin,dotted] (-3,-3) grid (3,3);
  \draw[->] (-3,0) -- (3,0) node[right] {x};
  \draw[->] (0,-3) -- (0,3) node[above] {y};
  \foreach \x/\xlabel in {-2/{\minus 2\hphantom{-}}, -1/{\minus 1\hphantom{-}}, 1/1, 2/2}
    \draw (\x cm,1pt ) -- (\x cm,-1pt ) node[anchor=north,fill=white] {\xlabel};
  \foreach \y/\ylabel in {-2/{\minus 2}, -1/{\minus 1}, 1/1, 2/2}
    \draw (1pt,\y cm) -- (-1pt ,\y cm) node[anchor=east, fill=white] {\ylabel};
  \draw[fill=black] (-2,-1) circle (0.08) node[above right] {\footnotesize (\raisebox{0.8pt}{-}2,\raisebox{0.8pt}{-}1)};
  \draw[fill=black] (0,0) circle (0.08) node[above right] {\footnotesize (0,0)};
  \draw[fill=black] (1,2) circle (0.08) node[above right] {\footnotesize (1,2)};
\end{tikzpicture}`;

  const svg = renderToSvg(source);
  assert.match(svg, /marker-end=/);
  assert.match(svg, /stroke-dasharray="1 6"/);
  assert.match(svg, /<tspan>x<\/tspan>/);
  assert.match(svg, /<tspan>y<\/tspan>/);
  assert.match(svg, /<tspan>- 2<\/tspan>|<tspan>-2<\/tspan>/);
  assert.match(svg, /<tspan>\(0,0\)<\/tspan>/);
  assert.match(svg, /font-size="11\.5"/);
  assert.match(svg, /font-size="10"/);
});

test("renders named colors and very thick strokes", () => {
  const source = String.raw`\begin{tikzpicture}
  \draw[thin,dotted] (-3,-3) grid (3,3);
  \draw[->] (-3,0) -- (3,0);
  \draw[->] (0,-3) -- (0,3);
  \draw[very thick, blue] (-2,-2) -- (-2,2)
  -- (2,2) -- (2,-2) -- cycle;
\end{tikzpicture}`;

  const svg = renderToSvg(source);
  assert.match(svg, /stroke="blue"/);
  assert.match(svg, /stroke-width="1\.6"/);
});

test("renders multiple circles in a single draw command", () => {
  const source = String.raw`\begin{tikzpicture}
  \draw[thin,dotted] (-3,-3) grid (3,3);
  \draw[->] (-3,0) -- (3,0);
  \draw[->] (0,-3) -- (0,3);
  \draw[very thick, blue] (-2,-2) circle (1) (-2,2)
    circle (1) (2,2) circle (1) (2,-2) circle (1);
\end{tikzpicture}`;

  const ast = parse(source);
  const operations = ast.commands[3].operations;
  assert.equal(operations.filter((operation) => operation.type === "move").length, 4);
  assert.equal(operations.filter((operation) => operation.type === "ellipse").length, 4);

  const svg = renderToSvg(source);
  assert.equal((svg.match(/fill="none"/g) || []).length >= 4, true);
  assert.match(svg, /stroke="blue"/);
  assert.match(svg, /stroke-width="1\.6"/);
});

test("renders polar coordinates, arcs, and shifted labels", () => {
  const source = String.raw`\begin{tikzpicture}[every node/.style={font=\sffamily\small}]
  \draw[thin,dotted] circle (1) circle (2) circle (3);
  \draw[->] (-3,0) -- (3,0) node[right] {x};
  \draw[->] (0,-3) -- (0,3) node[above] {y};
  \foreach \x/\xlabel in {-2/{\minus 2\hphantom{-}}, -1/{\minus 1\hphantom{-}}, 1/1, 2/2}
    \draw (\x cm,1pt ) -- (\x cm,-1pt ) node[anchor=north,fill=white] {\xlabel};
  \foreach \y/\ylabel in {-2/{\minus 2}, -1/{\minus 1}, 1/1, 2/2}
    \draw (1pt,\y cm) -- (-1pt ,\y cm) node[anchor=east, fill=white] {\ylabel};
  \draw[fill=black] (60:2) circle (0.08)   node[below right] {(60:2)};
  \draw [fill=blue!15](0,0) -- (1,0) arc (0:60:1cm);
  \draw[fill=black] circle (0.08) node[above left] {(0:0)}
    node [above right,xshift=0.2cm] {60\${}^\circ$};
  \draw [dashed](0,0) -- (60:2);
  \draw [dashed](1,0) -- (60:2);
  \draw[fill=black] (20:2) circle (0.08)   node[below right] {(20:2)};
  \draw[fill=black] (180:3) circle (0.08)   node[above right] {(180:3)};
\end{tikzpicture}`;

  const svg = renderToSvg(source);
  assert.match(svg, /fill="rgb\(217, 217, 255\)"/);
  assert.match(svg, /<path d="M .* L .*" stroke="currentColor" fill="none" stroke-width="0\.3"/);
  assert.match(svg, /fill="rgb\(217, 217, 255\)"/);
  assert.match(svg, /<tspan>\(60:2\)<\/tspan>/);
  assert.match(svg, /<tspan>60°<\/tspan>/);
  assert.match(svg, /<tspan>\(180:3\)<\/tspan>/);
});

test("renders projected 3d basis coordinates and transformed circles", () => {
  const source = String.raw`\begin{tikzpicture}[y={(-0.86cm,0.5cm)},x={(0.86cm,0.5cm)}, z={(0cm,1cm)},font=\sffamily]
  \draw[very thick, blue] (-2,-2,0) -- (-2,2,0) -- (2,2,0) -- (2,-2,0) -- cycle;
  \draw[->] (0,0,0) -- (2.5, 0,  0) node [right] {x};
  \draw[->] (0,0,0) -- (0,  2.5, 0) node [left] {y};
  \draw[->,dashed] (0,0,0) -- (0,  0, 2.5) node [above] {z};
  \draw circle (2);
\end{tikzpicture}`;

  const svg = renderToSvg(source);
  assert.match(svg, /stroke="blue"/);
  assert.match(svg, /stroke-width="1\.6"/);
  assert.match(svg, /<path d="M .* L .*" stroke="currentColor" fill="none" stroke-width="0\.55"/);
  assert.match(svg, /fill="none"/);
  assert.match(svg, /marker-end=/);
  assert.match(svg, /<tspan>z<\/tspan>/);
});

test("supports relative coordinates with plus syntax", () => {
  const source = String.raw`\begin{tikzpicture}
  \draw[thin,dotted] (-3,-3) grid (3,3);
  \draw[->] (-3,0) -- (3,0);
  \draw[->] (0,-3) -- (0,3);
  \draw[very thick, blue] (-3,-1) -- +(1,0) -- +(2,2) -- +(4,2) -- +(5,0) -- + (6,0);
\end{tikzpicture}`;

  const ast = parse(source);
  const operations = ast.commands[3].operations;
  assert.deepEqual(operations.slice(1).map((operation) => operation.point), [
    { x: -2, y: -1 },
    { x: -1, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: -1 },
    { x: 3, y: -1 }
  ]);
});

test("supports cumulative relative coordinates with double plus syntax", () => {
  const source = String.raw`\begin{tikzpicture}
  \draw[thin,dotted] (-3,-3) grid (3,3);
  \draw[->] (-3,0) -- (3,0);
  \draw[->] (0,-3) -- (0,3);
  \draw[very thick, blue] (-3,-1) -- ++(1,0) -- ++(1,2) -- ++(2,0) --++ (1,-2) -- ++ (1,0);
\end{tikzpicture}`;

  const ast = parse(source);
  const operations = ast.commands[3].operations;
  assert.deepEqual(operations.slice(1).map((operation) => operation.point), [
    { x: -2, y: -1 },
    { x: -1, y: 1 },
    { x: 1, y: 1 },
    { x: 2, y: -1 },
    { x: 3, y: -1 }
  ]);

  const svg = renderToSvg(source);
  assert.match(svg, /stroke="blue"/);
  assert.match(svg, /stroke-width="1\.6"/);
});

test("supports option-based circle, ellipse, and arc syntax", () => {
  const source = String.raw`\begin{tikzpicture}
  \draw (0,0) circle [radius=2];
  \draw (-0.5,0.5,0) ellipse [x radius=0.2, y radius=0.4];
  \draw (0.5,0.5) ellipse [x radius=0.2, y radius=0.4];
  \draw (-1,-1) arc [start angle=185, end angle=355,
    x radius=1, y radius=0.5];
  \draw (-3,-3) rectangle (3,3);
\end{tikzpicture}`;

  const ast = parse(source);
  assert.equal(ast.commands[0].operations[1].type, "ellipse");
  assert.equal(ast.commands[1].operations[1].type, "ellipse");
  assert.equal(ast.commands[3].operations[1].type, "arc");

  const svg = renderToSvg(source);
  assert.match(svg, /<path d="M .* L .*" stroke="currentColor" fill="none"/);
  assert.match(svg, / Z" stroke="currentColor" fill="none"/);
});

test("supports ball shading with ball color", () => {
  const source = String.raw`\begin{tikzpicture}
  \draw[shading=ball, ball color=yellow] (0,0) circle [radius=2];
  \draw[shading=ball, ball color=black] (-0.5,0.5,0) ellipse [x radius=0.2, y radius=0.4];
  \draw[shading=ball, ball color=black] (0.5,0.5,0) ellipse [x radius=0.2, y radius=0.4];
  \draw[very thick] (-1,-1) arc [start angle=185, end angle=355,
    x radius=1, y radius=0.5];
\end{tikzpicture}`;

  const svg = renderToSvg(source);
  assert.match(svg, /<radialGradient id="tikz-ball-gradient-/);
  assert.match(svg, /fill="url\(#tikz-ball-gradient-/);
  assert.match(svg, /ball-gradient-0/);
});

test("renders styled boxed nodes", () => {
  const source = String.raw`\begin{tikzpicture}
  \draw (4,2) node[draw, color=red, fill=yellow, text=blue] {TikZ};
\end{tikzpicture}`;

  const svg = renderToSvg(source);
  assert.match(svg, /<rect /);
  assert.match(svg, /stroke="red"/);
  assert.match(svg, /fill="yellow"/);
  assert.match(svg, /fill="blue"[^>]*><tspan x="[^"]+" dy="0" text-anchor="middle"><tspan>TikZ<\/tspan><\/tspan><\/text>/);
});

test("supports named nodes with rectangle circle and ellipse shapes", () => {
  const source = String.raw`\begin{tikzpicture}
  \node (r) at (0,1)   [draw, rectangle] {rectangle};
  \node (c) at (1.5,0) [draw, circle]    {circle};
  \node (e) at (3,1)   [draw, ellipse]   {ellipse};
\end{tikzpicture}`;

  const svg = renderToSvg(source);
  assert.match(svg, /<rect /);
  assert.match(svg, /<circle /);
  assert.match(svg, /<ellipse /);
  assert.match(svg, /<tspan>rectangle<\/tspan>/);
  assert.match(svg, /<tspan>circle<\/tspan>/);
  assert.match(svg, /<tspan>ellipse<\/tspan>/);
});

test("supports drawing between named node anchors", () => {
  const source = String.raw`\begin{tikzpicture}
  \node (r) at (0,1)   [draw, rectangle] {rectangle};
  \node (c) at (1.5,0) [draw, circle]    {circle};
  \node (e) at (3,1)   [draw, ellipse]   {ellipse};
  \draw[->] (r.east)  -- (e.west);
  \draw[->] (r.south) -- (c.north west);
  \draw[->] (e.south) -- (c.north east);
\end{tikzpicture}`;

  const svg = renderToSvg(source);
  assert.match(svg, /marker-end=/);
  assert.match(svg, /<rect /);
  assert.match(svg, /<circle /);
  assert.match(svg, /<ellipse /);
});

test("keeps stable circle anchor demo rendering available", () => {
  const svg = renderToSvg(readExample("circle-anchor-demo.tikz"));

  assert.doesNotMatch(svg, /NaN/);
  assert.match(svg, /<circle /);
  assert.match(svg, /<tspan>\(n\.north west\)<\/tspan>/);
  assert.match(svg, /<tspan>\(n\.mid east\)<\/tspan>/);
});

test("supports pragmatic stable-track mindmap trees", () => {
  const source = readExample("mindmap-basics.tikz");
  const ast = parse(source);

  assert.equal(ast.commands.length, 1);
  assert.equal(ast.commands[0].type, "mindmap");
  assert.equal(ast.commands[0].root.text, "Root");
  assert.equal(ast.commands[0].root.children.length, 3);
  assert.equal(ast.commands[0].root.children[0].node.children.length, 2);

  const svg = renderToSvg(source);
  assert.match(svg, /<circle /);
  assert.doesNotMatch(svg, /stroke-width="640"/);
  assert.match(svg, /<tspan>Root<\/tspan>/);
  assert.match(svg, /<tspan>Alpha<\/tspan>/);
  assert.match(svg, /<tspan>A1<\/tspan>/);
  assert.doesNotMatch(svg, /green!50!black/);
  assert.match(svg, /linearGradient/);
});

test("supports root concept append style in stable mindmaps", () => {
  const source = String.raw`\begin{tikzpicture}[
    mindmap,
    concept color=blue!50,
    root concept/.append style={concept color=purple, minimum size=4cm},
    text=white
  ]
    \path node[concept] {Root}
      child[grow=0] { node[concept] {Child} };
\end{tikzpicture}`;

  const svg = renderToSvg(source);
  assert.match(svg, /fill="purple"|fill="rgb\(/);
  assert.match(svg, /<tspan>Child<\/tspan>/);
});

test("supports official-example-style mindmap grow directions", () => {
  const source = String.raw`\begin{tikzpicture}[mindmap, concept color=red!50]
  \node[concept] {Root concept}
    child[grow=right] { node[concept] {Child concept} };
\end{tikzpicture}`;

  const svg = renderToSvg(source);
  assert.match(svg, /<circle /);
  assert.match(svg, /<tspan>Root concept<\/tspan>/);
  assert.match(svg, /<tspan>Child concept<\/tspan>/);
  assert.doesNotMatch(svg, /NaN/);
});

test("uses visible gradients for mindmap edges including deeper levels", () => {
  const svg = renderToSvg(readExample("mindmap-basics.tikz"));

  const gradientCount = (svg.match(/<linearGradient /g) || []).length;
  const greenFillCount = (svg.match(/fill="rgb\(0, 128, 0\)"/g) || []).length;

  assert.equal(gradientCount, 5);
  assert.ok(greenFillCount >= 3);
  assert.match(svg, /fill="url\(#tikz-linear-gradient-0\)"/);
});

test("supports node anchor demo with plot marks and named anchors", () => {
  const source = String.raw`\begin{tikzpicture}[node distance = 1mm]
  \node[name=n,shape=rectangle,shape example]
    {\Huge rectan\smash{g}le\hspace{3cm}node};
  \foreach \anchor/\placement in
    {center/above, text/below, 45/above right,
       mid/right, mid east/right, mid west/left,
       base/below, base east/below right, base west/below left,
       north/above, south/below, east/above right, west/above left,
       north east/above, south east/below, south west/below, north west/above}
      \draw[shift=(n.\anchor)] plot[mark=x] coordinates{(0,0)}
        node[\placement,label distance = 0mm,inner sep=3pt]
          {\scriptsize\texttt{(n.\anchor)}};
\end{tikzpicture}`;

  const svg = renderToSvg(source);
  assert.match(svg, /<tspan>\(n.center\)<\/tspan>/);
  assert.match(svg, /<tspan>\(n.mid east\)<\/tspan>/);
  assert.match(svg, /<tspan>\(n.45\)<\/tspan>/);
});

test("supports basic matrix layout with inherited node styles", () => {
  const source = String.raw`\begin{tikzpicture}
    \matrix[nodes={draw, fill=blue!15}, row sep=0.2cm, column sep=0.3cm, nodes={font=\sffamily}] {
      \node[diamond] {diamond};&
      \node[circle] {circle};\\
      \node[ellipse] {ellipse};&
      \node[rectangle] {rectangle};
    };
\end{tikzpicture}`;

  const svg = renderToSvg(source);
  assert.match(svg, /fill="rgb\(217, 217, 255\)"/);
  assert.match(svg, /<rect /);
  assert.match(svg, /<circle /);
  assert.match(svg, /<ellipse /);
  assert.match(svg, /<tspan>diamond<\/tspan>/);
  assert.match(svg, /<tspan>rectangle<\/tspan>/);
});

test("supports full css3 x11 named colors", () => {
  const source = String.raw`\begin{tikzpicture}
  \draw[darkslategray] (0,0) -- (1,0);
  \fill[lightgoldenrodyellow] (0.5,0.5) circle (0.2);
\end{tikzpicture}`;

  const svg = renderToSvg(source);
  assert.match(svg, /stroke="darkslategray"/);
  assert.match(svg, /fill="lightgoldenrodyellow"/);
});

test("example corpus manifest points to existing snippets", () => {
  const manifest = JSON.parse(readExample("examples.json"));

  assert.ok(manifest.length >= 4);

  for (const entry of manifest) {
    assert.ok(fs.existsSync(path.join(examplesDirectory, entry.file)), entry.file + " should exist");
  }
});

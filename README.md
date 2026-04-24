# tikz.js

`tikz.js` is a browser library that renders a focused TikZ subset into inline SVG.
It is intentionally reference-driven: prefer a small, solid subset over broad but fragile syntax coverage.

## Usage

Include the bundled script and add TikZ code inside any block element with the `tikz` class.

```html
<script src="dist/tikz.min.js"></script>

<div class="tikz">
\begin{tikzpicture}
  \draw (0,0) -- (2,0) -- (2,2) -- (0,2) -- cycle;
  \fill[fill=red] (1,1) circle (0.3);
  \node at (1,2.4) {Square};
\end{tikzpicture}
</div>
```

The library auto-renders `.tikz` elements on `DOMContentLoaded` and also exposes:

- `Tikz.renderAll()`
- `Tikz.renderElement(element)`
- `Tikz.renderToSvg(source)`

For interactive editing, open `editor.html`. It provides a live textarea-based playground that renders the current TikZ source immediately.
The editor also keeps the last source in `localStorage` and can copy or download the rendered SVG.

## Core Features

- browser-first usage with automatic rendering of `.tikz` elements
- inline SVG output
- live playground in `editor.html`
- bundled browser builds in:
  - `dist/tikz.js`
  - `dist/tikz.min.js`
- no runtime dependencies
- vanilla JavaScript implementation

Detailed user-facing compatibility notes live in `SUPPORTED_TIKZ.md`.

## Supported v1 Subset

- `\begin{tikzpicture} ... \end{tikzpicture}`
- optional `tikzpicture` options are accepted
- commands:
  - `\draw`
  - `\fill`
  - `\node`
- coordinates:
  - `(x,y)`
  - numeric values with optional `cm` and `pt`
- path operators and shapes:
  - `--`
  - `to ["label"] (...)`
  - `rectangle`
  - `circle`
  - `grid`
  - `cycle`
  - orthogonal connectors `|-` and `-|`
  - cubic curves with `.. controls (x1,y1) and (x2,y2) .. (x,y)`
- arrows:
  - `->`
  - `<-`
  - `<->`
- nodes:
  - `\node at (x,y) {text}`
  - path-attached nodes like `-- (x,y) node[right] {label}`
  - directional options `above`, `below`, `left`, `right`
  - combined directions like `above right`
  - anchor forms like `anchor=north`, `anchor=east`
- loops and source preprocessing:
  - simple `\foreach` expansion
  - `%` comments
- styling:
  - `draw=...`
  - `fill=...`
  - `color=...`
  - named color keywords
  - hex colors like `#3a6ea5`
  - `line width=...`
  - `thin`
  - `thick`
  - `very thick`
  - `dashed`
  - `dotted`
  - `opacity`
- text formatting currently mapped:
  - `\sffamily`
  - `\small`
  - `\footnotesize`
  - simplified handling for `\minus`, `\raisebox`, and `\hphantom` in labels

For a more precise breakdown of supported, approximate, experimental, and unsupported features, see `SUPPORTED_TIKZ.md`.

## Colors

- explicit colors through `color=...`, `draw=...`, and `fill=...`
- hex colors like `#ff7f50`
- bare named color keywords like `blue`
- full CSS3/X11 named color list, including examples like:
  - `darkslategray`
  - `lightgoldenrodyellow`
  - `cornflowerblue`
  - `mediumseagreen`
  - `orangered`

## Examples

The demo pages currently include working examples for:

- closed paths
- rectangles and circles
- dashed lines
- curved arrows
- bidirectional arcs
- orthogonal connectors
- circle with labeled edge
- axis/grid diagrams with `\foreach`, anchors, and point labels
- colored thick outlines

Example curved arrow:

```tex
\begin{tikzpicture}
  \draw[->, color=blue] (0,0) .. controls (1,1.5) and (2,1.5) .. (3,0);
\end{tikzpicture}
```

Axis-style example:

```tex
\begin{tikzpicture}[every node/.style={font=\sffamily\small}]
  \draw[thin,dotted] (-3,-3) grid (3,3);
  \draw[->] (-3,0) -- (3,0) node[right] {x};
  \draw[->] (0,-3) -- (0,3) node[above] {y};
\end{tikzpicture}
```

## Limitations

- `tikz.js` is intentionally a focused subset, not a full TikZ implementation
- TeX macro expansion is not generally implemented
- text layout is approximate and SVG/browser-font based rather than TeX-font based
- LaTeX comparison is used as a verification aid, not as an exact rendering match

## Development

```bash
npm install
npm run build
npm test
npm run test:latex
```

## Example Corpus

Reusable snippet files live in `examples/` with a small manifest in `examples/examples.json`.
LaTeX-backed verification cases are listed in `examples/latex-verify.json` and write comparison artifacts to `artifacts/latex-verify/`.

## Verification

- `npm test` runs the fast JavaScript regression suite
- `npm run test:latex` compares selected examples against a locally installed LaTeX toolchain and writes SVG artifacts for inspection

## License

This project is licensed under the MIT License. See `LICENSE`.

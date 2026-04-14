# Supported TikZ

This document is the user-facing compatibility guide for `tikz.js`.

Status meanings:

- supported: intended to work for normal use
- approximate: works, but does not fully match LaTeX/TikZ yet
- experimental: available, but still incomplete or fragile
- unsupported: currently not implemented

## Supported

- `\begin{tikzpicture} ... \end{tikzpicture}`
- rendering from `.tikz` HTML elements
- `\draw`
- `\fill`
- `\node`
- coordinates:
  - `(x,y)`
  - `(x,y,z)` with projected `x=...`, `y=...`, `z=...` bases
  - polar coordinates like `(30:2)`
  - numeric values with `cm`, `pt`, and simple `em` in node text-width usage
- basic path syntax:
  - `--`
  - `rectangle`
  - `circle`
  - `ellipse`
  - `grid`
  - `cycle`
  - `|-` and `-|`
  - `to ["label"] (...)`
- curves and arcs:
  - cubic curves with `.. controls ... and ... ..`
  - `arc (...)`
  - `arc [start angle=..., end angle=..., ...]`
- arrows:
  - `->`
  - `<-`
  - `<->`
- styling:
  - `draw=...`
  - `fill=...`
  - `text=...`
  - `color=...`
  - `line width=...`
  - `thin`, `thick`, `very thick`
  - `dashed`, `dotted`
  - `opacity`
  - named colors
  - hex colors
- basic loops and preprocessing:
  - `%` comments
  - simple `\foreach`
  - simple `\tikzset` style expansion
- node features:
  - named nodes
  - node anchors like `(n.east)`
  - anchor keywords such as `anchor=north`
  - directional placement such as `above right`
  - shaped boxed nodes with `draw`/`fill`/`text`
- live editor in `editor.html`

## Approximate

- text metrics and line wrapping
  - browser/SVG based, not TeX-exact
- shaped nodes in general
  - many shapes are visually close but still simplified
- ball shading
  - follows the LaTeX structure more closely now, but still not exact
- projected 3D circles
  - visually close, but still browser-approximate
- matrix support
  - row/column layout and inherited node styles work
  - many matrix shapes are still approximations

### Shapes currently approximate

- `kite`
- `isosceles triangle`
- `trapezium`
- `rectangle split`
- `circle split`
- `circular sector`
- `star`
- `starburst`
- `cloud`
- `dart`
- `cylinder`
- `signal`
- `tape`
- `magnetic tape`

## Experimental

- matrix-heavy TikZ examples using many specialized shapes
- multiline decorative shapes
- advanced node-anchor fidelity demos
- shape-specific text placement tuned from references

These may work for the current examples but should still be treated as evolving behavior.

## Unsupported

- full TeX macro expansion
- general math layout engine
- full TikZ matrix library fidelity
- arbitrary TikZ libraries and styles
- scopes, transforms, and broad style inheritance beyond the implemented subset
- Bezier/path syntax outside the currently supported forms
- many TikZ shapes not yet explicitly implemented or approximated

## Notes For Users

- If a feature works in `index.html` and has a side-by-side LaTeX reference, that is usually the best indicator of current fidelity.
- `editor.html` is useful for experimenting, but the more decorative or advanced a shape is, the more likely it is still approximate.
- `npm run test:latex` and `artifacts/latex-verify/` are intended for fidelity inspection when developing or evaluating support.

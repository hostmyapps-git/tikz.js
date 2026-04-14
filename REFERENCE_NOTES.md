# Reference Notes

This file captures behavior learned from comparing generated SVG output with LaTeX/TikZ reference output.

## General

- Geometry and text layout mismatches matter more than raw syntax support.
- Many visible differences come from text metrics, anchors, and bounding boxes rather than path syntax.
- When in doubt, inspect `artifacts/latex-verify/<example>/generated.svg` and `reference.svg` directly.

## Shading

- `shading=ball` is best approximated by:
  - a user-space radial gradient
  - filled into a larger square
  - clipped to the visible shape
  - with the outline rendered separately on top
- The ball gradient itself does not inherit the stroke color.
- The outer gradient stop should remain black even when the outline color changes.

## Nodes And Anchors

- `anchor=south west` and similar options anchor the node box itself, not just text alignment.
- `mid`, `base`, and `text` anchors are shape-sensitive and should not be treated as generic directional aliases.
- Circle and ellipse anchors should be resolved on the curved boundary, not on a rectangular proxy.
- Numeric anchors like `30` are best treated as radial anchors.

## Text

- `\hspace{...}` affects visible layout and node width.
- It is not enough to preserve only hidden width; rendered text needs the spacing too.
- Multiline text needs shape-aware handling in decorative shapes.
- `text width` should wrap words, including `em`-based values.

## Bounding And ViewBox

- Tight final SVG framing should use actual rendered element bounds, not only logical TikZ-space bounds.
- Invisible helper elements, such as clipped gradient fill rectangles, should not affect final visible bounds.
- Text-only directional labels need anchor-aware bounds, especially for `text-anchor="end"` cases.

## Matrixes

- Matrix layout quality depends heavily on node shape metrics.
- Overestimated cell metrics are often a larger source of whitespace than final SVG padding.
- Improving matrix fidelity usually means fixing individual node shapes and text placement rather than trimming the viewBox first.

## Current Especially Sensitive Areas

- shaped node metrics
- multiline text inside decorative shapes
- anchor-demo label placement
- matrix cell sizing

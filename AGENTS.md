## Project Description

Goal of the project is a JavaScript library that reads TikZ code and renders it as inline SVG in the browser.

The project is intentionally reference-driven:

- prefer a small, solid TikZ subset over broad but fragile syntax support
- grow support from concrete examples
- compare generated SVG against LaTeX/TikZ reference output whenever possible

Primary target:

- browser usage similar in spirit to Mermaid
- TikZ source embedded in HTML
- automatic rendering to inline SVG

## Coding conventions and environment

- use vanilla JavaScript only
- use UpperCamelCase for classes
- use lowerCamelCase for functions and variables
- do not add runtime dependencies
- prefer small, direct implementations over large abstractions
- preserve existing project structure unless there is a clear need to change it

Expected project files:

- `index.html` should demonstrate the library and show reference comparisons where available
- `editor.html` should provide an interactive playground
- stable examples should preferably also exist in `examples/`

Preferred workflow:

- implement from real examples
- add or update a demo example when a feature becomes usable
- add or update a regression test for non-trivial behavior
- use `npm run test:latex` when checking fidelity against LaTeX output

## Implementation Strategy

- Prefer a small, solid TikZ subset over broad but fragile syntax support.
- Expand support from concrete examples and compare against LaTeX reference output whenever possible.
- When implementing a larger feature, prefer this order:
  - layout/infrastructure first
  - fallback rendering second
  - fidelity tuning third
- Prefer exact geometry and anchor behavior before decorative fidelity.

## Rendering Priorities

When choosing what to improve next, prioritize in this order:

- geometry and path correctness
- node anchors and placement
- text layout and sizing
- bounding boxes and final viewBox correctness
- shape-specific fidelity
- broader syntax coverage

## Shape Guidance

- For supported shapes, prefer matching the LaTeX silhouette over inventing generic approximations.
- Use shape-specific metrics and shape-specific text placement when needed.
- Do not assume one node metric model fits all shapes.
- When a shape is only approximate, keep the implementation simple and document the limitation.

## Text Guidance

- Text layout is a major source of mismatch with LaTeX output.
- Treat these as geometry-affecting inputs:
  - `inner xsep`
  - `inner ysep`
  - `text width`
  - explicit line breaks
  - `\hspace`
  - node anchors
- Prefer measured or derived text geometry over fixed offsets whenever practical.

## Matrix Guidance

- Matrix support may be implemented incrementally.
- First target:
  - row and column layout
  - inherited node styles
  - spacing
- Then improve individual shapes inside matrix cells one at a time.

## Example Workflow

When adding a stable demo example, prefer to also add:

- an entry in `index.html`
- an entry in `editor.html`
- a fixture in `examples/<name>.tikz`
- a regression test when the behavior is non-trivial
- a LaTeX reference entry when the example is stable enough for comparison
- updates to `README.md` and `SUPPORTED_TIKZ.md` when user-visible capabilities or limitations change

## Reference-Driven Workflow

- Use `npm run test:latex` to generate LaTeX comparison artifacts.
- Use `artifacts/latex-verify/` to inspect generated SVG vs. LaTeX reference SVG.
- Side-by-side comparison in `index.html` is intended as a fast visual fidelity check.
- Continuously document important rendering and reference learnings in the `*_NOTES.md` files as they are discovered.
- If a feature is hard to reproduce, capture the observed LaTeX behavior in `REFERENCE_NOTES.md` and the current approximation in `SHAPE_NOTES.md`.
- Reevaluate `README.md` and `SUPPORTED_TIKZ.md` after major changes so user-facing documentation stays accurate.

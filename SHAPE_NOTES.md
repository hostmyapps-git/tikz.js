# Shape Notes

This file tracks the current fidelity status of non-trivial shapes and where approximation is still present.

## Status Legend

- close: visually close to the LaTeX reference
- approximate: recognizably similar but still simplified
- fallback: basic approximation only

## Node Shapes

- `rectangle`: close
- `circle`: close
- `ellipse`: close
- `diamond`: close
- `kite`: approximate
- `isosceles triangle`: approximate
- `trapezium`: approximate
- `regular polygon`: close for current examples
- `rectangle split`: approximate
- `circle split`: approximate
- `semicircle`: close
- `circular sector`: approximate but much improved

## Symbol And Decorative Shapes

- `forbidden sign`: close
- `star`: approximate but improved
- `starburst`: approximate but improved
- `cloud`: fallback
- `dart`: approximate but improved

## Tape Family

- `cylinder`: approximate but improved
- `signal`: approximate, text placement tuned
- `tape`: approximate, multiline-safe geometry added
- `magnetic tape`: approximate but much improved from reference-based silhouette

## Notes

- Matrix shapes should be improved one family at a time.
- If a shape is visually close enough for the current demos, prefer moving on rather than overfitting immediately.
- Shapes with multiline text often need shape-specific text placement, not only larger outer metrics.

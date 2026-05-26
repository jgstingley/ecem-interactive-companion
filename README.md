# ECEM Interactive Companion

Interactive companion for the published paper:

**Dynamical systems analysis of an Einstein-Cartan ekpyrotic nonsingular bounce cosmology**<br>
Jackson Stingley, *General Relativity and Gravitation* 58, 46 (2026)<br>
DOI: [10.1007/s10714-026-03547-w](https://doi.org/10.1007/s10714-026-03547-w)

This app lets readers explore selected calculations from the paper: phase-space trajectories, Lyapunov behavior, a cosmic-time bounce timeline, and the bounce-basin scan in the softening-parameter plane.

## Run Locally

This is a static site. From this folder:

```bash
python3 -m http.server 8008
```

Then open:

```text
http://127.0.0.1:8008/
```

Opening `index.html` directly may fail in some browsers because the app loads local JSON data files.

## Contents

- `index.html` - static app entry point
- `app.jsx` and `sections-*.jsx` - React components
- `lib.js` - browser-side numerical helpers
- `data/*.json` - precomputed numerical data used by the visualizations
- `assets/journal-figures/` - selected figure assets
- `screenshots/` - preview images for documentation and project pages

## Scope

This app is a companion to the paper, not a replacement for it. If you use it in research or teaching, cite the article alongside the app.

The model is explicitly limited to homogeneous backgrounds. It does not address perturbations, observational fitting, entropy accumulation across cycles, or the full inhomogeneous BKL problem.

## License

This repository uses a split license:

- Source code is released under the MIT License. See `LICENSE-CODE`.
- Content, figures, screenshots, and numerical data are released under CC BY 4.0. See `LICENSE-CONTENT`.

The CC BY 4.0 content license matches the open-access license of the associated article.

## Suggested Citation

If this app helps you understand or reuse the work, please cite the paper:

```bibtex
@article{Stingley2026ECEM,
  author = {Stingley, Jackson},
  title = {Dynamical systems analysis of an Einstein-Cartan ekpyrotic nonsingular bounce cosmology},
  journal = {General Relativity and Gravitation},
  volume = {58},
  number = {46},
  year = {2026},
  doi = {10.1007/s10714-026-03547-w}
}
```

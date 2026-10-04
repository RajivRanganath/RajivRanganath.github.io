# rajivranganath.github.io

Personal portfolio. Static files, no build step (libraries load from CDNs):

- `index.html`: the page and all styles
- `js/world.js`: the Three.js world the page flies through (Earth, debris field, tracked objects, project satellites, the particle name, Bangalore uplink, bloom) and the camera director
- `js/land.js`: generated land mask for Earth (Fibonacci-sphere bitmask, 7 KB)
- `js/scope.js`: the live radar demo (two trackers on one noisy stream)
- `js/main.js`: boot sequence, camera shots per section, the veil and HUD (reticles, leader lines), GSAP + SplitText scroll choreography, project data and popups, contact form
- `tracker.js`: tracking engine (Kalman filters, GNN via Hungarian, cheap JPDA)
- `tracker.check.js`: self-check for the tracker math, run with `node tracker.check.js`
- `assets/`: project screenshots (only `composio.jpg` is published; see below)
- `og.jpg`: link preview image (1200x630, rendered from the live hero)
- `404.html`: shown by GitHub Pages for unknown URLs
- `resume.pdf`

## Deploy to GitHub Pages

1. Create a public repo named exactly `RajivRanganath.github.io`.
2. Push this folder to it:
   ```bash
   git init && git add . && git commit -m "Portfolio"
   git branch -M main
   git remote add origin https://github.com/RajivRanganath/RajivRanganath.github.io.git
   git push -u origin main
   ```
3. Repo Settings > Pages > Source: `main` branch, `/ (root)`. Live at https://rajivranganath.github.io in a minute or two.

## Contact form

Without setup, the form opens the visitor's email app. To receive messages directly:
create a free form at https://formspree.io, then paste its ID into `FORMSPREE_ID` near the top of `js/main.js`.

## Updating

- New resume: replace `resume.pdf`.
- The eight smaller projects: edit the `MORE` array at the top of `js/main.js`. The four main projects are in `index.html`.
- After a big visual change, re-render `og.jpg` from the hero at 1200x630.

## Source visuals and claim context

- `assets/ledgerguard-evidence.jpg`: frame from the existing LedgerGuard demo recording, showing verified and rejected refund checks.
- `assets/orbit-performance.png`: Orbit Guard project-generated performance report; the homepage tracker is a separate browser simulation.
- `assets/esg-evidence-flow.png`: project architecture figure from `Project(kgp)/docs/figures/fig1_topic1_architecture.png`.
- `assets/marl-energy-freshness.png`: research figure from `FinalYearProject-MARL/results/figures/13_energy_vs_aoi.png`.

The four images above are kept out of the repo (`.gitignore`): their numbers do not match the current claims.

The IIT Kharagpur figure follows the resume wording: 62.7 to 81.4% verified accuracy across four locked test sets (a range, not an improvement over time). Older project records described 81.4% as a citation-presence proxy, so confirm the wording before publishing.

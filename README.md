# Orpheon

Data consulting website for **Orpheon** — two data scientists on sidequests for good.

## Live locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Deploy on GitHub Pages

1. Push this repo to GitHub (already set up as `orpheus`).
2. In the repo: **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Choose branch `main` (or this PR branch after merge) and folder `/ (root)`.
5. Save. The site will be available at `https://<username>.github.io/orpheus/`.

If the site is served from a project subpath, no extra base path is required — assets use relative URLs.

## Customize

- Team names & bios: edit the `#team` section in `index.html`
- Contact email: update `hello@orpheon.dev` in `index.html` and `main.js`
- Colors & type: CSS variables at the top of `styles.css`

# YouTube Subscription Groups

A Chrome extension project for organizing YouTube's Subscriptions page into stacked sections based on creator categories.

The prototype categories are **Reacts**, **Gaming**, and **Tech**, followed by **Other** for uncategorized creators. Creators can belong to multiple categories, and their videos appear in every assigned section.

## Status

Project scaffold only. The extension entry point and category model are in place; grouped video rendering, assignment controls, and saving settings are not implemented yet. See [PLAN.md](PLAN.md) for the implementation plan.

## Development

Install Node.js 22 or newer and pnpm, then run:

```sh
pnpm install
pnpm run build
```

Load the extension in Chrome:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked** and choose this project's `dist` directory.
4. Open or refresh YouTube's Subscriptions page.

The scaffold currently logs a message in the page's developer console. It does not change the feed yet.

```sh
pnpm run dev        # Watch and rebuild TypeScript source
pnpm run typecheck  # Check TypeScript without building
pnpm run build      # Type-check and build the extension
```

After changes, reload the extension in Chrome and refresh YouTube. Restart the watcher when changing files under `public/`. Watch mode does not run type-checking.

Use pnpm for dependency management and commit the generated `pnpm-lock.yaml` after the first install.

## Project structure

- `public/manifest.json` — Chrome Manifest V3 configuration.
- `src/content/` — YouTube page integration.
- `src/shared/categories.ts` — Category types and prototype defaults.
- `scripts/build.mjs` — Bundles the content script and copies extension assets to `dist/`.
- `PLAN.md` — Product behavior and implementation milestones.

The content script is registered on YouTube pages to support in-site navigation; its entry point currently acts only on Subscriptions. The storage permission is reserved for the planned locally saved settings.

## Connect to GitHub

Create an empty repository on GitHub, then run these commands from this folder, replacing the remote URL with your repository URL:

```sh
git init -b main
git add .
git commit -m "Initialize Chrome extension project"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

Generated files, dependencies, local environment files, and agent configuration folders are ignored by Git.

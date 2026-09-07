# YouTube Subscription Groups

A Chrome extension project for organizing YouTube's Subscriptions page into stacked sections based on creator categories.

The prototype categories are **Reacts**, **Gaming**, and **Tech**, followed by **Other** for uncategorized creators. Creators can belong to multiple categories, and their videos appear in every assigned section.

## Status

The first prototype implements stacked category sections, creator assignment checklists, and locally saved settings. Full category management and backup import/export are still planned. See [PLAN.md](PLAN.md).

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

Initially, videos appear under **Other**. Click **Categories** on a video, select one or more categories for its creator, and click **Save**. Every loaded video from that creator appears in the selected sections. Future videos use the same saved assignments. Clear all selections to return the creator to Other.

Use **Show original feed** to restore YouTube's native cards whenever needed.

```sh
pnpm run dev        # Watch and rebuild TypeScript source
pnpm run typecheck  # Check TypeScript without building
pnpm test           # Check grouping, identity, and settings behavior
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

The content script is registered on YouTube pages to support in-site navigation; the grouped interface acts only on Subscriptions. Assignments use [Chrome extension local storage](https://developer.chrome.com/docs/extensions/reference/api/storage).

## Prototype limitations and browser checks

- Only loaded videos are organized, in their source feed order. Choose YouTube's newest-first feed ordering when available.
- Native continuation controls remain below the sections. Live YouTube infinite scrolling still needs browser verification; if loading stalls, switch to the original feed, scroll to load more, then switch back.
- Creator identity uses the channel URL exposed by the card, often a handle. Handle changes or a switch between handle and channel-ID URLs can require reassignment.
- Unrecognized card layouts stay in the native feed. Videos with unreadable creator information appear in Other without an assignment button.
- Custom cards currently include thumbnails, titles, creator names, and category controls. Native hover previews and video action menus are available through the original-feed toggle.
- Settings are shared within the Chrome profile, not separated by signed-in YouTube account. Avoid editing assignments simultaneously in multiple tabs.

After reloading the extension and refreshing YouTube, check that a creator assigned to Reacts and Tech appears in both sections and leaves Other. Refresh to check persistence, clear assignments to check Other, then scroll for older videos and navigate away and back. Also check keyboard controls and YouTube's light/dark themes. Automated tests do not replace these live browser checks.

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

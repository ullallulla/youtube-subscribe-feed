# YouTube Subscription Groups

A Chrome extension project for organizing YouTube's Subscriptions page into stacked sections based on creator categories.

The prototype categories are **Reacts**, **Gaming**, and **Tech**, followed by a fixed **Shorts** section and **Other** for uncategorized regular videos. Each creator belongs to one category for regular videos. Shorts from every creator appear in Shorts, which is not an option in the category picker. Original YouTube Shorts shelves remain intact, and standalone Shorts retain their vertical native cards.

## Status

The first prototype implements stacked category sections, single-category creator assignments, and locally saved settings. Full category management and backup import/export are still planned. See [PLAN.md](PLAN.md).

## Development

Install Node.js 22.12 or newer and pnpm, then run:

```sh
pnpm install
pnpm run build
```

Load the extension in Chrome:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked** and choose this project's `dist` directory.
4. Open or refresh YouTube's Subscriptions page.

Every section starts collapsed, including **Shorts** and **Other**. Click a section title to expand or collapse it; you can also focus the title and press Enter or Space. Sections keep their open/closed state as more videos load, when YouTube replaces its feed container, and when switching between original and grouped views. They start collapsed again on a page refresh or a new visit to Subscriptions.

Expanded categories show up to 10 loaded videos initially. **Show more** reveals up to another 10 loaded videos. Once all loaded videos in that category are visible, it requests one more YouTube feed batch, which may contain videos for other categories. The button remains visible for partial batches and is disabled while it needs a pending load or when YouTube has no load-more control available. **Show fewer** returns to the first 10 while keeping the category open and the extra cards loaded. Each category keeps its limit during feed updates and original/grouped view switching. Shorts shelves keep their native layout and are not limited by these controls.

Initially, regular videos appear under **Other**. Expand it and click **Choose category** below a video, select a category for its creator, and click **Save**. Every loaded video from that creator moves to that section. Future videos use the same saved assignment. Choose **Other** to remove the assignment. YouTube’s native three-dot menu keeps its normal actions.

Use **Load more videos** at the bottom to request older uploads. Opening or scrolling through a category does not expose the native load-more control. Use **Show original feed** to restore YouTube’s normal layout and scrolling.

Existing multi-category settings migrate automatically: the first assigned category in section order is retained. A copy of the old settings is kept in extension storage under `subscriptionGroupsSettingsV1Backup`. New settings use version 2 with one category ID or `null` per creator.

```sh
pnpm run dev        # Watch and rebuild the extension with Vite
pnpm run typecheck  # Check TypeScript without building
pnpm test           # Check grouping, settings, and React UI behavior
pnpm run build      # Type-check and build the extension
```

After changes, reload the extension in Chrome and refresh YouTube. Restart the watcher when changing files under `public/`. Watch mode does not run type-checking.

Vite builds a standalone `dist/content.js` and copies `public/manifest.json` into `dist/`. `pnpm run dev` uses Vite's build watcher; it does not start a web server or provide React Fast Refresh inside YouTube. React is bundled locally. The toolbar and category dialog use Shadow DOM; native cards stay in YouTube’s light DOM with scoped section styles. No additional Chrome permissions are needed.

Use pnpm for dependency management and commit the generated `pnpm-lock.yaml` after the first install.

## Project structure

- `public/manifest.json` — Chrome Manifest V3 configuration.
- `src/content/index.ts` — YouTube navigation, feed observation, storage, and React root lifecycle.
- `src/content/App.tsx` — React toolbar and single-choice creator category dialog.
- `src/content/native-cards.ts` — Groups cards visually with CSS while preserving their native DOM positions; manages section expansion and explicit loading.
- `src/content/extract.ts` — YouTube card extraction.
- `src/content/styles.ts` — Shadow DOM control styles and scoped native-section styles, including dark mode.
- `src/shared/categories.ts` — Category types and prototype defaults.
- `vite.config.ts` — Vite/React configuration producing a single classic content script.
- `tests/` — Grouping tests and React interaction checks. esbuild is retained only for test bundling.
- `PLAN.md` — Product behavior and implementation milestones.

The content script is registered on YouTube pages to support in-site navigation; the grouped interface acts only on Subscriptions. Assignments use [Chrome extension local storage](https://developer.chrome.com/docs/extensions/reference/api/storage).

## Prototype limitations and browser checks

- Only loaded videos are organized, in their source feed order. Choose YouTube's newest-first feed ordering when available.
- Shelves headed **Most relevant** or **Osuvimmat** are excluded from grouped view, including their unique videos. The original-feed toggle restores these shelves. Filtering uses shelf headings, not video IDs.
- Grouped view uses an explicit **Load more videos** button. Native continuation controls are exposed for a load request and hidden again when feed links change or after five seconds. Newly inserted source cards stay hidden until grouped. YouTube’s loading behavior still needs live browser verification; if loading stalls, switch to the original feed, scroll to load more, then switch back.
- Creator identity uses the channel URL exposed by the card, often a handle. Handle changes or a switch between handle and channel-ID URLs can require reassignment.
- Unrecognized card layouts remain available through Show original feed. Videos with unreadable creator information appear in Other without an assignment button.
- Cards are the actual YouTube elements, including native metadata, watched-progress bars, and menus. Cards and Shorts shelves keep their original parents; CSS grid ordering and `display: contents` on layout wrappers arrange them into sections without moving or cloning native elements. Native hover playback and load-more behavior still require live Chrome verification. Visual category order differs from DOM reading and keyboard navigation order.
- Settings are shared within the Chrome profile, not separated by signed-in YouTube account. Avoid editing assignments simultaneously in multiple tabs.

After reloading the extension and refreshing YouTube, assign a creator to Tech and check that their original cards appear only there. Refresh to check persistence, select Other to remove the assignment, then use **Load more videos** for older videos and navigate away and back. Check hover previews, watched-progress bars, native three-dot menus, and the original-feed toggle. Also check keyboard controls and YouTube's light/dark themes. Automated tests do not replace these live browser checks.

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

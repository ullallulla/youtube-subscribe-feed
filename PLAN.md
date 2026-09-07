# YouTube Subscriptions Category Extension Plan

## Goal

Create a Chrome extension that reorganizes YouTube's Subscriptions page into stacked category sections. Each section has a heading and a responsive grid of videos, matching the user's sketch.

Categories belong to creators. All current and future videos from a creator inherit that creator's category; individual videos do not need to be categorized.

## Prototype categories and layout

The initial section order is:

1. Reacts
2. Gaming
3. Tech
4. Shorts (fixed section, not a creator category)
5. Other

Each section displays the newest videos first. The number of columns adapts to the available screen width. Opening Subscriptions immediately shows the grouped layout with saved assignments.

## Core behavior

- A creator belongs to one category at a time for regular videos.
- Shorts from all creators go to a fixed Shorts section immediately before Other. Shorts is excluded from the category picker.
- Preserve native Shorts shelves and standalone vertical cards, including restoration to the original feed.
- Reuse original YouTube cards to retain native menus, metadata, watched progress, and hover behavior where supported.
- Arrange each original card visually in one section using CSS; retain its native DOM parent and never clone it across categories.
- Other always appears last and contains videos from creators with no category assignments.
- Assigning a creator to their first category removes their videos from Other.
- Selecting Other removes the creator’s category assignment.
- Users can choose the order of custom categories.
- The stacked sections are the main interface; selecting filters is not required to see the organized feed.
- All sections start collapsed. Clicking a section title toggles its videos; each section can be opened independently, including Shorts and Other.

## Implementation plan

### 1. Build the extension foundation

- Use TypeScript, React, Vite, and Chrome Manifest V3.
- Use a content script to integrate the grouped interface into YouTube's Subscriptions page.
- Account for navigation into Subscriptions from another YouTube page without a full refresh.
- Save categories, category order, and creator assignments using Chrome's local extension storage.
- Scope permissions to the YouTube integration and extension storage needed for the feature.
- Start without a backend, separate account, or YouTube API key.

### 2. Verify feed integration

- Identify video cards, video identity, creator identity, and feed order reliably.
- Prefer stable channel identifiers over creator display names; verify what identifiers the page exposes before choosing the final mapping approach.
- Preserve native card ancestry and use CSS grid ordering with flattened layout wrappers to create sections.
- Keep native cards outside React ownership and Shadow DOM; React owns the toolbar and category dialog.
- Verify native hover playback, menus, watched progress, and loading with the grouped layout.
- Preserve working video links and playback behavior.
- Verify that loading older videos continues to work after reorganizing the page.
- Handle missing creator information without guessing an assignment or losing the video.

### 3. Create the prototype grouped feed

- Seed Reacts, Gaming, and Tech as editable categories on first installation.
- Add Other as a permanent automatic section.
- Render category headings and responsive video grids.
- Preserve newest-first ordering within each category.
- Keep each original card in one category and preserve source order.
- Show a clear empty state when a category has no matching loaded videos.
- Initially show up to 10 loaded videos per expanded category. Show more reveals up to another 10 loaded videos, or requests one feed batch if all matching loaded videos are visible. Keep the button visible for partial batches and disable it if loading is pending or unavailable. Show fewer returns to the first 10 without collapsing the section or removing native cards. Keep these limits during feed updates; preserve intact Shorts shelves outside this limit.

### 4. Add creator assignment controls

- Add a separate Choose category control below each original card, preserving the native three-dot menu.
- Open a single-choice dialog for assigning the creator to one category or Other.
- Make clear that the dialog edits the creator’s category, not just the selected video.
- Update all loaded videos from that creator immediately across all sections.
- Save changes automatically and apply them to future uploads.

### 5. Add category management

- Allow creating, renaming, reordering, and deleting custom categories.
- Allow creating a category directly from the creator assignment dialog.
- Provide a searchable list of creators encountered in the feed and controls to edit their assignments.
- Keep Other last and manage its membership automatically.
- When a category is deleted, return its creators to Other.
- Add export/import for backing up categories and assignments, with validation before applying imported data.

### 6. Handle loading and navigation

- Categorize newly loaded videos while preserving expanded sections.
- Use an explicit Load more videos button; opening a section must not expose continuation controls. Hide those controls again after a feed update or a bounded timeout.
- Restore controls and the grouped layout when returning to Subscriptions.
- Avoid duplicate controls, repeated event handlers, and unnecessary page processing.
- Keep the extension's grouped layout scoped to Subscriptions.

### 7. Validate and polish

- Verify moving a creator from Reacts to Tech moves all their cards into Tech only.
- Verify legacy multi-category settings migrate to the first assigned category in section order, preserving a backup of the old settings.
- Verify an unassigned creator appears only in Other.
- Verify assigning and removing categories updates all affected sections immediately.
- Verify settings persist across refreshes and browser restarts.
- Verify category renaming, reordering, and deletion preserve the expected assignments.
- Verify newly loaded videos are grouped correctly and older videos remain reachable.
- Verify navigation away from and back to Subscriptions works without a full refresh.
- Check video links, playback behavior, keyboard access, light/dark themes, and different screen widths.
- Provide instructions for building and loading the extension locally in Chrome.

## First milestone

A working Subscriptions-page prototype with Reacts, Gaming, Tech, and Other; single-choice creator assignment dialogs; native YouTube cards; persistent settings; and working loading of additional feed videos.

After the prototype is reliable, add full category management, backup import/export, and visual polish.

## Initial scope and limitations

- The first version organizes videos that YouTube has loaded into the subscription feed. It does not maintain a complete historical index of every subscription.
- An empty section means no matching videos are currently loaded, not necessarily that the creators have no older videos.
- Creator management initially covers creators encountered in the feed, rather than promising a complete import of all subscriptions.
- Assignments are manual at the creator level. Automatic topic classification and per-video tagging are outside the initial scope.
- Local settings are stored per Chrome profile. Cross-device synchronization is outside the initial scope.
- YouTube page structure can change, so feed detection and rendering should be isolated for easier maintenance.

## Technical references

- [Chrome Manifest documentation](https://developer.chrome.com/docs/extensions/reference/manifest)
- [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Chrome extension storage](https://developer.chrome.com/docs/extensions/reference/api/storage)

## Native-card migration

Settings version 2 stores one category ID or null per creator. Version 1 memberships are migrated using category section order; the original settings are backed up under `subscriptionGroupsSettingsV1Backup`. Native playback and continuation behavior require live Chrome validation in addition to DOM tests.

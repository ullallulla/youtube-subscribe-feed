# YouTube Subscriptions Category Extension Plan

## Goal

Create a Chrome extension that reorganizes YouTube's Subscriptions page into stacked category sections. Each section has a heading and a responsive grid of videos, matching the user's sketch.

Categories belong to creators. All current and future videos from a creator inherit that creator's assignments; individual videos do not need to be categorized.

## Prototype categories and layout

The initial section order is:

1. Reacts
2. Gaming
3. Tech
4. Other

Each section displays the newest videos first. The number of columns adapts to the available screen width. Opening Subscriptions immediately shows the grouped layout with saved assignments.

## Core behavior

- A creator can belong to multiple categories.
- Videos from a creator assigned to both Reacts and Gaming appear in both sections.
- A video appears at most once within each section.
- Other always appears last and contains videos from creators with no category assignments.
- Assigning a creator to their first category removes their videos from Other.
- Removing a creator's last assignment returns their videos to Other.
- Users can choose the order of custom categories.
- The stacked sections are the main interface; selecting filters is not required to see the organized feed.

## Implementation plan

### 1. Build the extension foundation

- Use TypeScript and Chrome Manifest V3.
- Use a content script to integrate the grouped interface into YouTube's Subscriptions page.
- Account for navigation into Subscriptions from another YouTube page without a full refresh.
- Save categories, category order, and creator assignments using Chrome's local extension storage.
- Scope permissions to the YouTube integration and extension storage needed for the feature.
- Start without a backend, separate account, or YouTube API key.

### 2. Verify feed integration

- Identify video cards, video identity, creator identity, and feed order reliably.
- Prefer stable channel identifiers over creator display names; verify what identifiers the page exposes before choosing the final mapping approach.
- Prototype the grouped rendering strategy, including showing a video in multiple sections.
- Preserve working video links and playback behavior.
- Verify that loading older videos continues to work after reorganizing the page.
- Handle missing creator information without guessing an assignment or losing the video.

### 3. Create the prototype grouped feed

- Seed Reacts, Gaming, and Tech as editable categories on first installation.
- Add Other as a permanent automatic section.
- Render category headings and responsive video grids.
- Preserve newest-first ordering within each category.
- Deduplicate videos within each category while allowing them across different categories.
- Show a clear empty state when a category has no matching loaded videos.

### 4. Add creator assignment controls

- Add a Categories control to video cards.
- Open a checklist for assigning the creator to one or more categories.
- Make clear that the checklist edits the creator's assignments, not just the selected video.
- Update all loaded videos from that creator immediately across all sections.
- Save changes automatically and apply them to future uploads.

### 5. Add category management

- Allow creating, renaming, reordering, and deleting custom categories.
- Allow creating a category directly from the creator assignment checklist.
- Provide a searchable list of creators encountered in the feed and controls to edit their assignments.
- Keep Other last and manage its membership automatically.
- When a category is deleted, preserve other assignments and return creators with no remaining assignments to Other.
- Add export/import for backing up categories and assignments, with validation before applying imported data.

### 6. Handle loading and navigation

- Categorize newly loaded videos as the user scrolls.
- Keep a usable way to load older videos after cards have been grouped.
- Restore controls and the grouped layout when returning to Subscriptions.
- Avoid duplicate controls, repeated event handlers, and unnecessary page processing.
- Keep the extension's grouped layout scoped to Subscriptions.

### 7. Validate and polish

- Verify a creator assigned to Reacts and Tech appears in both sections, once per video per section.
- Verify an unassigned creator appears only in Other.
- Verify assigning and removing categories updates all affected sections immediately.
- Verify settings persist across refreshes and browser restarts.
- Verify category renaming, reordering, and deletion preserve the expected assignments.
- Verify newly loaded videos are grouped correctly and older videos remain reachable.
- Verify navigation away from and back to Subscriptions works without a full refresh.
- Check video links, playback behavior, keyboard access, light/dark themes, and different screen widths.
- Provide instructions for building and loading the extension locally in Chrome.

## First milestone

A working Subscriptions-page prototype with Reacts, Gaming, Tech, and Other; creator assignment checklists; support for multiple categories per creator; persistent settings; and working loading of additional feed videos.

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

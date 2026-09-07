import { createDefaultSettings, type Settings } from '../shared/categories';
import { parseSettings, type Video } from '../shared/feed';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { App } from './App';
import { extractVideos } from './extract';
import { styles } from './styles';

const STORAGE_KEY = 'subscriptionGroupsSettings';
const HIDDEN = 'data-subscription-groups-hidden';
let settings: Settings = createDefaultSettings();
let ready = false;
let original = false;
let feed: HTMLElement | null = null;
let host: HTMLElement | null = null;
let root: Root | null = null;
let lastSignature = '';
let videos: Video[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;

const pageStyle = document.createElement('style');
pageStyle.textContent = `[${HIDDEN}] { display: none !important; }`;
document.head.append(pageStyle);

function restoreCards(): void {
  document.querySelectorAll(`[${HIDDEN}]`).forEach(card => card.removeAttribute(HIDDEN));
}

function unmount(): void {
  restoreCards();
  root?.unmount();
  host?.remove();
  host = null;
  root = null;
  feed = null;
  videos = [];
  lastSignature = '';
}

async function saveCreator(creatorId: string, categoryIds: string[]): Promise<void> {
  const next: Settings = {
    ...settings,
    creatorAssignments: { ...settings.creatorAssignments, [creatorId]: categoryIds },
  };
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
  settings = next;
  lastSignature = '';
  refresh();
}

function render(): void {
  root?.render(createElement(App, {
    videos,
    settings,
    original,
    onToggle: () => { original = !original; lastSignature = ''; refresh(); },
    onSave: saveCreator,
  }));
}

function refresh(): void {
  if (!ready) return;
  if (location.pathname !== '/feed/subscriptions') { unmount(); return; }
  const current = document.querySelector<HTMLElement>('ytd-browse[page-subtype="subscriptions"]:not([hidden])');
  if (!current) { unmount(); return; }
  const grid = current.querySelector<HTMLElement>('ytd-rich-grid-renderer, ytd-section-list-renderer');
  if (!grid) return;
  if (feed !== current || !host?.isConnected) {
    unmount();
    feed = current;
    host = document.createElement('div');
    host.id = 'youtube-subscription-groups';
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = styles;
    const container = document.createElement('div');
    shadow.append(style, container);
    root = createRoot(container);
    grid.before(host);
  }
  const extracted = extractVideos(grid);
  videos = extracted.videos;
  if (original) restoreCards();
  else for (const card of extracted.cards) {
    if (!card.hasAttribute(HIDDEN)) card.setAttribute(HIDDEN, '');
  }
  const signature = JSON.stringify([videos, settings, original]);
  if (signature !== lastSignature) {
    lastSignature = signature;
    render();
  }
}

function schedule(): void {
  if (timer !== undefined) return;
  timer = setTimeout(() => { timer = undefined; refresh(); }, 150);
}

// Shadow DOM rendering does not trigger this observer. YouTube's native
// continuation controls remain beneath the grouped sections to load more videos.
const observer = new MutationObserver(schedule);
observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['href', 'src', 'hidden'] });
document.addEventListener('yt-navigate-finish', schedule);
window.addEventListener('popstate', schedule);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes[STORAGE_KEY]) return;
  try {
    settings = parseSettings(changes[STORAGE_KEY].newValue);
    lastSignature = '';
    schedule();
  } catch (error) { console.error('[YouTube Subscription Groups]', error); }
});

async function start(): Promise<void> {
  try {
    const saved = await chrome.storage.local.get(STORAGE_KEY);
    settings = parseSettings(saved[STORAGE_KEY]);
    ready = true;
    refresh();
  } catch (error) {
    console.error('[YouTube Subscription Groups] Could not load settings. Original feed preserved.', error);
  }
}
void start();

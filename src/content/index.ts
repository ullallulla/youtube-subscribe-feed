import { createDefaultSettings, type Settings } from '../shared/categories';
import { parseSettings } from '../shared/feed';
import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { App, type Editor } from './App';
import { NativeCards } from './native-cards';
import { styles, nativeStyles } from './styles';

const STORAGE_KEY = 'subscriptionGroupsSettings';
let settings: Settings = createDefaultSettings();
let ready = false;
let original = false;
let feed: HTMLElement | null = null;
let grid: HTMLElement | null = null;
let host: HTMLElement | null = null;
let root: Root | null = null;
let nativeCards: NativeCards | null = null;
let editor: Editor | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const pageStyle = document.createElement('style');
pageStyle.textContent = nativeStyles;
document.head.append(pageStyle);

function unmount(): void {
  nativeCards?.restore();
  nativeCards = null;
  root?.unmount();
  host?.remove();
  host = null;
  root = null;
  feed = null;
  grid = null;
  editor = null;
}

async function saveCreator(creatorId: string, categoryId: string | null): Promise<void> {
  const next = parseSettings({ ...settings,
    creatorAssignments: { ...settings.creatorAssignments, [creatorId]: categoryId },
  });
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
  settings = next;
  refresh();
}

function dismiss(): void {
  const trigger = editor?.trigger;
  editor = null;
  render();
  requestAnimationFrame(() => {
    if (trigger?.isConnected) trigger.focus();
    else host?.shadowRoot?.querySelector<HTMLButtonElement>('header button')?.focus();
  });
}

function render(): void {
  root?.render(createElement(App, { settings, original, editor,
    onToggle: () => { original = !original; editor = null; refresh(); },
    onDismiss: dismiss, onSave: saveCreator,
  }));
}

function updateFeed(): void {
  if (!ready) return;
  if (location.pathname !== '/feed/subscriptions') { unmount(); return; }
  const current = document.querySelector<HTMLElement>('ytd-browse[page-subtype="subscriptions"]:not([hidden])');
  const currentGrid = current?.querySelector<HTMLElement>('ytd-rich-grid-renderer, ytd-section-list-renderer');
  if (!current || !currentGrid) { unmount(); return; }
  if (feed !== current || grid !== currentGrid || !host?.isConnected) {
    unmount();
    feed = current;
    grid = currentGrid;
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
  if (original) {
    nativeCards?.restore();
    nativeCards = null;
  } else {
    if (nativeCards && !nativeCards.container.isConnected) {
      nativeCards.restore();
      nativeCards = null;
    }
    nativeCards ??= new NativeCards(currentGrid, (video, trigger) => { editor = { video, trigger }; render(); });
    nativeCards.sync(settings);
  }
  render();
}

function refresh(): void {
  // Ignore our own moves, but continue observing YouTube's later updates.
  observer.disconnect();
  try { updateFeed(); }
  catch (error) {
    unmount();
    console.error('[YouTube Subscription Groups] Restored original cards after an integration error.', error);
  } finally { observe(); }
}

function schedule(): void {
  if (timer !== undefined) return;
  timer = setTimeout(() => { timer = undefined; refresh(); }, 150);
}

const observer = new MutationObserver(schedule);
function observe(): void {
  observer.observe(document.body, { childList: true, subtree: true, characterData: true,
    attributes: true, attributeFilter: ['href', 'src', 'hidden'] });
}
observe();
document.addEventListener('yt-navigate-finish', schedule);
window.addEventListener('popstate', schedule);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes[STORAGE_KEY]) return;
  try { settings = parseSettings(changes[STORAGE_KEY].newValue); schedule(); }
  catch (error) { console.error('[YouTube Subscription Groups]', error); }
});

async function start(): Promise<void> {
  try {
    const saved = await chrome.storage.local.get(STORAGE_KEY);
    settings = parseSettings(saved[STORAGE_KEY]);
    if (saved[STORAGE_KEY]?.version === 1) {
      // Keep the original memberships available before replacing them.
      const backupKey = `${STORAGE_KEY}V1Backup`;
      const backup = await chrome.storage.local.get(backupKey);
      await chrome.storage.local.set({ [STORAGE_KEY]: settings,
        ...(backup[backupKey] === undefined ? { [backupKey]: saved[STORAGE_KEY] } : {}),
      });
    }
    ready = true;
    refresh();
  } catch (error) {
    console.error('[YouTube Subscription Groups] Could not load settings. Original feed preserved.', error);
  }
}
void start();

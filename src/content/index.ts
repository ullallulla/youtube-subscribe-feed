import { createDefaultSettings, type Settings } from '../shared/categories';
import { groupVideos, parseSettings, type Video } from '../shared/feed';
import { extractVideos } from './extract';
import { styles } from './styles';

const STORAGE_KEY = 'subscriptionGroupsSettings';
const HIDDEN = 'data-subscription-groups-hidden';
let settings: Settings = createDefaultSettings();
let ready = false;
let original = false;
let feed: HTMLElement | null = null;
let host: HTMLElement | null = null;
let shadow: ShadowRoot | null = null;
let lastSignature = '';
let videos: Video[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;

const pageStyle = document.createElement('style');
pageStyle.textContent = `[${HIDDEN}] { display: none !important; }`;
document.head.append(pageStyle);

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

function restoreCards(): void {
  document.querySelectorAll(`[${HIDDEN}]`).forEach(card => card.removeAttribute(HIDDEN));
}

function unmount(): void {
  restoreCards();
  host?.remove();
  host = null;
  shadow = null;
  feed = null;
  videos = [];
  lastSignature = '';
}

function editCreator(video: Video, trigger: HTMLButtonElement): void {
  if (!shadow || !video.creatorId) return;
  const creatorId = video.creatorId;
  const dialog = element('dialog');
  const heading = element('h2', `Categories for ${video.creatorName}`);
  heading.id = 'category-dialog-title';
  dialog.setAttribute('aria-labelledby', heading.id);
  dialog.append(heading, element('p', 'All videos from this creator will appear in each selected category.'));
  const fieldset = element('fieldset');
  fieldset.append(element('legend', 'Choose categories'));
  const selected = new Set(settings.creatorAssignments[creatorId] ?? []);
  for (const category of settings.categories) {
    const label = element('label');
    const input = element('input');
    input.type = 'checkbox';
    input.checked = selected.has(category.id);
    input.addEventListener('change', () => input.checked ? selected.add(category.id) : selected.delete(category.id));
    label.append(input, document.createTextNode(category.name));
    fieldset.append(label);
  }
  const error = element('p');
  error.className = 'error';
  error.setAttribute('role', 'alert');
  const actions = element('div');
  actions.className = 'actions';
  const cancel = element('button', 'Cancel');
  cancel.addEventListener('click', () => dialog.close());
  const save = element('button', 'Save');
  save.addEventListener('click', async () => {
    save.disabled = true;
    const next: Settings = { ...settings, creatorAssignments: { ...settings.creatorAssignments, [creatorId]: [...selected] } };
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: next });
      settings = next;
      dialog.close();
      dialog.remove();
      lastSignature = '';
      refresh();
      shadow?.querySelector<HTMLButtonElement>('header button')?.focus();
    } catch {
      error.textContent = 'Could not save. Try again, or reload this page if the extension was updated.';
      save.disabled = false;
    }
  });
  actions.append(cancel, save);
  dialog.append(fieldset, element('p', 'Leave all unchecked to place this creator in Other.'), error, actions);
  dialog.addEventListener('close', () => { dialog.remove(); if (trigger.isConnected) trigger.focus(); schedule(); });
  shadow.append(dialog);
  dialog.showModal();
}

function render(): void {
  if (!shadow) return;
  shadow.replaceChildren();
  const style = element('style', styles);
  const header = element('header');
  const toggle = element('button', original ? 'Show grouped feed' : 'Show original feed');
  toggle.addEventListener('click', () => { original = !original; lastSignature = ''; refresh(); });
  header.append(element('h1', 'Your subscription groups'), toggle);
  const hint = element('p', original
    ? 'You are viewing the original YouTube feed.'
    : 'Choose Categories on a video to organize its creator. Sections include videos loaded so far, in feed order. Scroll down to load more.');
  hint.className = 'hint';
  shadow.append(style, header, hint);
  if (original) return;
  const groups = groupVideos(videos, settings);
  for (const category of [...settings.categories, { id: 'other', name: 'Other' }]) {
    const section = element('section');
    const items = groups.get(category.id)!;
    section.append(element('h2', `${category.name} · ${items.length}`));
    const grid = element('div');
    grid.className = 'grid';
    for (const video of items) {
      const card = element('article');
      const link = element('a');
      link.href = video.url;
      const img = element('img');
      img.src = video.thumbnail;
      img.alt = '';
      img.loading = 'lazy';
      link.append(img, element('h3', video.title));
      const creator = element('p', video.creatorName);
      creator.className = 'creator';
      card.append(link, creator);
      if (video.creatorId) {
        const button = element('button', 'Categories');
        button.setAttribute('aria-label', `Choose categories for ${video.creatorName}`);
        button.addEventListener('click', () => editCreator(video, button));
        card.append(button);
      }
      grid.append(card);
    }
    if (items.length) section.append(grid);
    else {
      const empty = element('p', 'No matching videos loaded yet.');
      empty.className = 'empty';
      section.append(empty);
    }
    shadow.append(section);
  }
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
    host = element('div');
    host.id = 'youtube-subscription-groups';
    shadow = host.attachShadow({ mode: 'open' });
    grid.before(host);
  }
  // Do not interrupt someone editing assignments as new videos arrive.
  if (shadow?.querySelector('dialog[open]')) return;
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
observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['href', 'src', 'hidden'] });
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

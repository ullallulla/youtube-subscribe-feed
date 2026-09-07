import { SHORTS_SECTION_ID, type Settings } from '../shared/categories';
import { feedSections, videoSection, type Video } from '../shared/feed';
import { extractRelevantShelves, extractShortsShelves, extractVideos } from './extract';

interface CardRecord {
  card: HTMLElement;
  video: Video | null;
  button: HTMLButtonElement;
  originalId: string | null;
  originalOrder: string;
}
interface Section {
  node: HTMLElement;
  title: HTMLElement;
  toggle: HTMLButtonElement;
  empty: HTMLElement;
  controls: HTMLElement;
  more: HTMLButtonElement;
  fewer: HTMLButtonElement;
}
const VIDEOS_PER_PAGE = 10;
let nextId = 0;
const setAttribute = (node: Element, name: string, value: string) => {
  if (node.getAttribute(name) !== value) node.setAttribute(name, value);
};
const setHidden = (node: HTMLElement, value: boolean) => {
  if (node.hidden !== value) node.hidden = value;
};
const setOrder = (node: HTMLElement, value: number) => {
  const order = String(value);
  if (node.style.order !== order) node.style.order = order;
};

/** Arrange cards with CSS only. YouTube retains every native parent/child relationship. */
export class NativeCards {
  private records = new Map<HTMLElement, CardRecord>();
  private sections = new Map<string, Section>();
  private excludedShelves = new Set<HTMLElement>();
  private flattened = new Set<HTMLElement>();
  private source: HTMLElement;
  private settings: Settings | null = null;
  private loadButton = document.createElement('button');
  private loadStatus = document.createElement('p');
  private loadingTimer: ReturnType<typeof setTimeout> | undefined;
  private loadingControl: HTMLElement | null = null;
  private loadingSignature = '';
  readonly container = document.createElement('div');

  constructor(
    private feed: HTMLElement,
    private edit: (video: Video, trigger: HTMLButtonElement) => void,
    private expandedSections = new Set<string>(),
    private visibleLimits = new Map<string, number>(),
  ) {
    this.container.dataset.nativeGroups = '';
    this.source = feed.querySelector<HTMLElement>(':scope > #contents') ?? feed;
    this.source.setAttribute('data-native-group-source', '');
    this.feed.setAttribute('data-native-grouped', '');
    this.source.prepend(this.container);
    const footer = document.createElement('div');
    footer.className = 'native-group-footer';
    this.loadButton.type = 'button';
    this.loadButton.textContent = 'Load more videos';
    this.loadButton.addEventListener('click', event => { event.stopPropagation(); this.loadMore(); });
    this.loadStatus.setAttribute('role', 'status');
    footer.append(this.loadButton, this.loadStatus);
    this.container.append(footer);
  }

  isAttached(): boolean {
    const source = this.feed.querySelector(':scope > #contents') ?? this.feed;
    return this.container.isConnected && this.source === source && this.container.parentElement === source;
  }

  private signature(): string {
    // Include native shelf children so a new Shorts page also finishes a load.
    return Array.from(this.feed.querySelectorAll('a[href*="/watch?"], a[href*="/shorts/"]'))
      .map(link => link.getAttribute('href')).join('|');
  }

  private finishLoading(message: string): void {
    clearTimeout(this.loadingTimer);
    this.loadingTimer = undefined;
    this.loadingControl?.removeAttribute('data-native-load-control');
    this.loadingControl = null;
    this.feed.removeAttribute('data-native-loading');
    this.loadButton.disabled = false;
    this.loadButton.textContent = 'Load more videos';
    this.loadStatus.textContent = message;
    this.layout();
  }

  private continuation(): HTMLElement | undefined {
    return Array.from(this.source.querySelectorAll<HTMLElement>('ytd-continuation-item-renderer'))
      .reverse().find(node => !node.closest('[data-native-group-excluded], [data-native-shorts-shelf]'));
  }

  private loadMore(): void {
    if (this.loadingTimer !== undefined) return;
    const continuation = this.continuation();
    if (!continuation) {
      this.loadStatus.textContent = 'No load-more control is available. You can check the original feed.';
      return;
    }
    this.loadingSignature = this.signature();
    this.loadingControl = continuation;
    continuation.setAttribute('data-native-load-control', '');
    this.feed.setAttribute('data-native-loading', '');
    this.loadButton.disabled = true;
    this.loadButton.textContent = 'Loading…';
    this.loadStatus.textContent = '';
    this.loadingTimer = setTimeout(() => this.finishLoading('Loading paused. Try again or check the original feed.'), 5000);
    this.layout();
    // Expose the existing continuation only on request. No synthetic navigation,
    // playback events or private YouTube APIs are invoked.
    continuation.scrollIntoView({ block: 'end' });
    continuation.querySelector<HTMLButtonElement>('button')?.click();
  }

  private clearCard(record: CardRecord): void {
    record.button.remove();
    for (const name of ['data-native-card', 'data-native-card-collapsed', 'data-native-short', 'data-native-shorts-shelf']) {
      record.card.removeAttribute(name);
    }
    record.card.style.order = record.originalOrder;
    if (record.originalId === null) record.card.removeAttribute('id');
  }

  sync(settings: Settings): void {
    this.settings = settings;
    if (this.loadingTimer !== undefined && this.signature() !== this.loadingSignature) this.finishLoading('Feed updated.');
    const excluded = extractRelevantShelves(this.feed);
    for (const shelf of this.excludedShelves) if (!excluded.includes(shelf)) shelf.removeAttribute('data-native-group-excluded');
    this.excludedShelves = new Set(excluded);
    for (const shelf of excluded) setAttribute(shelf, 'data-native-group-excluded', '');
    const { cards, videos } = extractVideos(this.feed, excluded);
    const items = cards.map((card, index) => ({ card, video: videos[index] as Video | null }));
    items.push(...extractShortsShelves(this.feed, excluded).map(card => ({ card, video: null })));
    const current = new Set(items.map(item => item.card));
    for (const [card, record] of this.records) {
      if (!current.has(card)) { this.clearCard(record); this.records.delete(card); }
    }
    const flattened = new Set<HTMLElement>();
    for (const { card, video } of items) {
      let record = this.records.get(card);
      if (!record) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'native-group-category';
        button.textContent = 'Choose category';
        button.setAttribute('aria-haspopup', 'dialog');
        record = { card, video, button, originalId: card.getAttribute('id'), originalOrder: card.style.order };
        const entry = record;
        button.addEventListener('click', event => { event.stopPropagation(); if (entry.video) this.edit(entry.video, button); });
        this.records.set(card, record);
        if (!card.id) card.id = `subscription-native-card-${++nextId}`;
      }
      record.video = video;
      setAttribute(card, 'data-native-card', '');
      if (video?.isShort) setAttribute(card, 'data-native-short', '');
      else card.removeAttribute('data-native-short');
      if (!video) setAttribute(card, 'data-native-shorts-shelf', '');
      else card.removeAttribute('data-native-shorts-shelf');
      if (video?.creatorId && !video.isShort) {
        setAttribute(record.button, 'aria-label', `Choose category for ${video.creatorName}`);
        if (record.button.parentElement !== card) card.append(record.button);
      } else record.button.remove();
      // Flatten only layout wrappers on the existing path to the source grid.
      for (let parent = card.parentElement; parent && parent !== this.source; parent = parent.parentElement) {
        if (!this.source.contains(parent)) break;
        flattened.add(parent);
      }
    }
    // Native continuation wrappers also need a layout box when explicitly loading.
    for (const continuation of Array.from(this.source.querySelectorAll('ytd-continuation-item-renderer'))) {
      for (let parent = continuation.parentElement; parent && parent !== this.source; parent = parent.parentElement) flattened.add(parent);
    }
    for (const node of this.flattened) if (!flattened.has(node)) node.removeAttribute('data-native-flat');
    for (const node of flattened) setAttribute(node, 'data-native-flat', '');
    this.flattened = flattened;
    // Limits follow source feed order even when YouTube inserts or reorders cards.
    this.records = new Map(items.map(({ card }) => [card, this.records.get(card)!]));
    this.layout();
  }

  private layout(): void {
    if (!this.settings) return;
    const categories = feedSections(this.settings);
    for (const [id, section] of this.sections) {
      if (!categories.some(category => category.id === id)) { section.node.remove(); this.sections.delete(id); this.expandedSections.delete(id); this.visibleLimits.delete(id); }
    }
    for (const [index, category] of categories.entries()) {
      let section = this.sections.get(category.id);
      if (!section) {
        const node = document.createElement('section');
        const title = document.createElement('h2');
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'native-group-toggle';
        toggle.addEventListener('click', event => {
          event.stopPropagation();
          if (!this.expandedSections.delete(category.id)) this.expandedSections.add(category.id);
          this.layout();
        });
        const empty = document.createElement('p');
        empty.className = 'native-group-empty';
        empty.id = `subscription-empty-${++nextId}`;
        empty.textContent = 'No matching videos loaded yet.';
        const controls = document.createElement('div');
        controls.className = 'native-group-pagination';
        const more = document.createElement('button');
        more.type = 'button';
        more.textContent = 'Show more';
        more.addEventListener('click', event => {
          event.stopPropagation();
          if (!this.settings) return;
          const count = [...this.records.values()].filter(record => record.video && videoSection(record.video, this.settings!) === category.id).length;
          const limit = this.visibleLimits.get(category.id) ?? VIDEOS_PER_PAGE;
          this.visibleLimits.set(category.id, Math.min(count, limit) + VIDEOS_PER_PAGE);
          if (count <= limit) this.loadMore();
          this.layout();
        });
        const fewer = document.createElement('button');
        fewer.type = 'button';
        fewer.textContent = 'Show fewer';
        fewer.addEventListener('click', event => {
          event.stopPropagation();
          this.visibleLimits.set(category.id, VIDEOS_PER_PAGE);
          this.layout();
          toggle.focus();
        });
        controls.append(more, fewer);
        title.append(toggle);
        node.append(title, empty, controls);
        this.container.append(node);
        section = { node, title, toggle, empty, controls, more, fewer };
        this.sections.set(category.id, section);
      }
      if (section.toggle.textContent !== category.name) section.toggle.textContent = category.name;
      const expanded = this.expandedSections.has(category.id);
      setAttribute(section.toggle, 'aria-expanded', String(expanded));
      setOrder(section.title, index * 3);
      setOrder(section.empty, index * 3 + 1);
      setOrder(section.controls, index * 3 + 2);
      const limit = category.id === SHORTS_SECTION_ID ? Infinity : (this.visibleLimits.get(category.id) ?? VIDEOS_PER_PAGE);
      const controls: string[] = [];
      for (const record of this.records.values()) {
        const id = record.video ? videoSection(record.video, this.settings) : SHORTS_SECTION_ID;
        if (id !== category.id) continue;
        setOrder(record.card, index * 3 + 1);
        if (expanded && controls.length < limit) record.card.removeAttribute('data-native-card-collapsed');
        else setAttribute(record.card, 'data-native-card-collapsed', '');
        controls.push(record.card.id);
      }
      setHidden(section.empty, !expanded || controls.length > 0);
      const needsLoad = controls.length <= limit;
      const disabled = needsLoad && (this.loadingTimer !== undefined || !this.continuation());
      if (section.more.disabled !== disabled) section.more.disabled = disabled;
      setAttribute(section.more, 'title', needsLoad
        ? (disabled ? 'Loading is in progress or YouTube has no load-more control available.' : 'Load another feed batch to look for older videos in this category.')
        : 'Show more loaded videos in this category.');
      setHidden(section.fewer, limit <= VIDEOS_PER_PAGE || controls.length <= VIDEOS_PER_PAGE);
      setHidden(section.controls, !expanded || category.id === SHORTS_SECTION_ID || (section.more.hidden && section.fewer.hidden));
      setAttribute(section.more, 'aria-label', `Show more videos in ${category.name}`);
      setAttribute(section.fewer, 'aria-label', `Show fewer videos in ${category.name}`);
      setAttribute(section.toggle, 'aria-controls', controls.length ? controls.join(' ') : section.empty.id);
    }
  }

  restore(): void {
    clearTimeout(this.loadingTimer);
    this.loadingTimer = undefined;
    this.loadingControl?.removeAttribute('data-native-load-control');
    this.loadingControl = null;
    for (const record of this.records.values()) this.clearCard(record);
    this.records.clear();
    for (const node of this.flattened) node.removeAttribute('data-native-flat');
    this.flattened.clear();
    for (const shelf of this.excludedShelves) shelf.removeAttribute('data-native-group-excluded');
    this.excludedShelves.clear();
    this.sections.clear();
    this.container.remove();
    this.source.removeAttribute('data-native-group-source');
    this.feed.removeAttribute('data-native-grouped');
    this.feed.removeAttribute('data-native-loading');
  }
}

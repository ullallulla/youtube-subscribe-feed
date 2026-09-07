import type { Settings } from '../shared/categories';
import type { Video } from '../shared/feed';
import { extractVideos } from './extract';

interface CardRecord {
  card: HTMLElement;
  video: Video;
  marker: Comment;
  wrapper: HTMLDivElement;
  button: HTMLButtonElement;
}

function move(parent: HTMLElement, node: HTMLElement, before: ChildNode | null): void {
  // Modern Chrome can move connected nodes without resetting playback state.
  const target = parent as HTMLElement & { moveBefore?: (node: Node, before: Node | null) => void };
  if (target.moveBefore && parent.isConnected && node.isConnected) target.moveBefore(node, before);
  else parent.insertBefore(node, before);
}

/** Owns placement only. Never clone cards or replace their internal DOM. */
export class NativeCards {
  private records = new Map<HTMLElement, CardRecord>();
  private sections = new Map<string, { section: HTMLElement; heading: HTMLElement; grid: HTMLElement; empty: HTMLElement }>();
  readonly container: HTMLDivElement;

  constructor(private feed: HTMLElement, private edit: (video: Video, trigger: HTMLButtonElement) => void) {
    this.container = document.createElement('div');
    this.container.dataset.nativeGroups = '';
    // Retain the original renderer ancestors for delegated YouTube events/styles.
    const contents = feed.querySelector(':scope > #contents') ?? feed;
    contents.prepend(this.container);
  }

  sync(settings: Settings): void {
    // Source refreshes can remove placeholders. Drop those cards rather than
    // resurrecting a previous feed batch or restoring into detached containers.
    for (const [card, record] of this.records) {
      if (!record.marker.isConnected || !card.isConnected) {
        record.wrapper.remove();
        record.marker.remove();
        this.records.delete(card);
      }
    }
    const { videos, cards } = extractVideos(this.feed);
    cards.forEach((card, index) => {
      const existing = this.records.get(card);
      if (existing) { existing.video = videos[index]; return; }
      const marker = document.createComment('subscription-groups: original card position');
      card.before(marker);
      const wrapper = document.createElement('div');
      wrapper.dataset.nativeGroupCard = '';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'native-group-category';
      button.textContent = 'Choose category';
      button.setAttribute('aria-haspopup', 'dialog');
      const record = { card, video: videos[index], marker, wrapper, button };
      button.addEventListener('click', event => {
        event.stopPropagation();
        this.edit(record.video, button);
      });
      this.records.set(card, record);
    });

    const categories = [...settings.categories, { id: 'other', name: 'Other' }];
    for (const [id, section] of this.sections) {
      if (!categories.some(category => category.id === id)) {
        // Cards will be moved into their remaining category below.
        section.section.hidden = true;
      }
    }
    for (const [index, category] of categories.entries()) {
      let section = this.sections.get(category.id);
      if (!section) {
        const node = document.createElement('section');
        const heading = document.createElement('h2');
        const grid = document.createElement('div');
        grid.className = 'native-group-grid';
        const empty = document.createElement('p');
        empty.className = 'native-group-empty';
        empty.textContent = 'No matching videos loaded yet.';
        node.append(heading, grid, empty);
        section = { section: node, heading, grid, empty };
        this.sections.set(category.id, section);
      }
      section.section.hidden = false;
      if (this.container.children[index] !== section.section) {
        move(this.container, section.section, this.container.children[index] ?? null);
      }
    }
    const counts = new Map(categories.map(category => [category.id, 0]));
    // Markers stay at the original positions, so grouping never changes feed order.
    const records = [...this.records.values()].sort((a, b) =>
      a.marker.compareDocumentPosition(b.marker) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
    for (const record of records) {
      const assignment = record.video.creatorId ? settings.creatorAssignments[record.video.creatorId] : null;
      const id = assignment && counts.has(assignment) ? assignment : 'other';
      const grid = this.sections.get(id)!.grid;
      const position = counts.get(id)!;
      if (grid.children[position] !== record.wrapper) move(grid, record.wrapper, grid.children[position] ?? null);
      if (record.card.parentElement !== record.wrapper) move(record.wrapper, record.card, record.wrapper.firstChild);
      if (record.video.creatorId) {
        record.button.setAttribute('aria-label', `Choose category for ${record.video.creatorName}`);
        if (record.button.parentElement !== record.wrapper) record.wrapper.append(record.button);
      } else record.button.remove();
      counts.set(id, position + 1);
    }
    for (const category of categories) {
      const section = this.sections.get(category.id)!;
      const count = counts.get(category.id)!;
      const title = `${category.name} · ${count}`;
      if (section.heading.textContent !== title) section.heading.textContent = title;
      section.empty.hidden = count > 0;
    }
    for (const [id, section] of this.sections) {
      if (!counts.has(id)) { section.section.remove(); this.sections.delete(id); }
    }
  }

  restore(): void {
    for (const record of this.records.values()) {
      if (record.marker.isConnected && record.card.isConnected) {
        move(record.marker.parentElement!, record.card, record.marker);
      }
      record.marker.remove();
      record.wrapper.remove();
    }
    this.records.clear();
    this.sections.clear();
    this.container.remove();
  }
}

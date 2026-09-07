import { creatorIdentity, type Video } from '../shared/feed';

// Keep YouTube-specific selectors together for future layout changes.
const CARD_SELECTOR = 'ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-video-renderer, yt-lockup-view-model';
const METADATA_ROW_SELECTOR = [
  '.yt-content-metadata-view-model__metadata-row',
  '.yt-content-metadata-view-model-wiz__metadata-row',
  '.ytContentMetadataViewModelMetadataRow',
].join(', ');
const METADATA_TEXT_SELECTOR = [
  '.yt-content-metadata-view-model__metadata-text',
  '.yt-content-metadata-view-model-wiz__metadata-text',
  '.ytContentMetadataViewModelMetadataText',
].join(', ');

function extractMetadata(card: Element): string[] {
  const text = (nodes: NodeListOf<Element>) => Array.from(nodes)
    .map(node => node.textContent?.replace(/\s+/g, ' ').trim() ?? '')
    .filter(Boolean);
  const legacy = text(card.querySelectorAll('#metadata-line .inline-metadata-item'));
  if (legacy.length) return legacy;

  // New layouts can put views beside the creator, with the age on another row.
  // Exclude only creator text, not its whole row, and retain localized labels.
  const metadata: string[] = [];
  for (const row of Array.from(card.querySelectorAll(METADATA_ROW_SELECTOR))) {
    for (const item of Array.from(row.querySelectorAll(METADATA_TEXT_SELECTOR))) {
      if (Array.from(item.querySelectorAll<HTMLAnchorElement>('a[href]')).some(link => creatorIdentity(link.href))) continue;
      const value = item.textContent?.replace(/\s+/g, ' ').trim();
      if (value) metadata.push(value);
    }
  }
  return [...new Set(metadata)];
}

export function extractVideos(feed: Element): { videos: Video[]; cards: HTMLElement[] } {
  const videos: Video[] = [];
  const cards: HTMLElement[] = [];
  for (const card of Array.from(feed.querySelectorAll<HTMLElement>(CARD_SELECTOR))) {
    const links = Array.from(card.querySelectorAll<HTMLAnchorElement>('a[href]'));
    const watch = links.find(link => /\/(watch\?|shorts\/)/.test(link.getAttribute('href') ?? ''));
    if (!watch) continue;
    const url = new URL(watch.href, location.origin);
    const id = url.pathname === '/watch' ? url.searchParams.get('v') : url.pathname.match(/^\/shorts\/([^/]+)/)?.[1];
    if (!id) continue;
    const titleElement = card.querySelector<HTMLElement>('#video-title, #video-title-link, .yt-lockup-metadata-view-model__title, h3 a');
    const title = titleElement?.textContent?.trim() || watch.getAttribute('title') || watch.getAttribute('aria-label');
    if (!title) continue;
    const creator = links.find(link => creatorIdentity(link.href) && link.textContent?.trim()) ?? links.find(link => creatorIdentity(link.href));
    const img = card.querySelector<HTMLImageElement>('img');
    videos.push({ id, url: url.href, title,
      thumbnail: img?.currentSrc?.startsWith('https:') ? img.currentSrc : `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`,
      creatorId: creator ? creatorIdentity(creator.href) : null,
      creatorName: creator?.textContent?.trim() || 'Creator unavailable',
      metadata: extractMetadata(card),
    });
    cards.push(card);
  }
  return { videos, cards };
}

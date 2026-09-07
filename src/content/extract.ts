import { creatorIdentity, type Video } from '../shared/feed';

// Keep YouTube-specific selectors together for future layout changes.
const CARD_SELECTOR = 'ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-video-renderer, yt-lockup-view-model';

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
    });
    cards.push(card);
  }
  return { videos, cards };
}

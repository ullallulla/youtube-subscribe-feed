import { creatorIdentity, type Video } from '../shared/feed';

// Keep YouTube-specific selectors together for future layout changes.
const CARD_SELECTOR = 'ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-video-renderer, yt-lockup-view-model, ytd-reel-item-renderer, yt-shorts-lockup-view-model, ytm-shorts-lockup-view-model';
const SHORTS_SHELF_SELECTOR = 'ytd-rich-shelf-renderer[is-shorts], ytd-reel-shelf-renderer';

/** Match shelf headings, never video titles or arbitrary text within a card. */
export function extractRelevantShelves(feed: Element): HTMLElement[] {
  const candidates = Array.from(feed.querySelectorAll<HTMLElement>(
    'ytd-rich-section-renderer, ytd-rich-shelf-renderer, ytd-reel-shelf-renderer, ytd-shelf-renderer, ytm-rich-shelf-renderer',
  )).filter(shelf => Array.from(shelf.querySelectorAll('#title, #title-text, h2, [role="heading"]')).some(heading => {
    if (heading.closest(CARD_SELECTOR)) return false;
    const title = heading.textContent?.replace(/\s+/g, ' ').trim().toLowerCase();
    return title === 'most relevant' || title === 'osuvimmat';
  }));
  return candidates.filter(shelf => !candidates.some(parent => parent !== shelf && parent.contains(shelf)));
}

/** Move the whole shelf so its carousel, controls and vertical cards stay intact. */
export function extractShortsShelves(feed: Element, excluded = extractRelevantShelves(feed)): HTMLElement[] {
  return [...new Set(Array.from(feed.querySelectorAll<HTMLElement>(SHORTS_SHELF_SELECTOR))
    .filter(shelf => !excluded.some(section => section.contains(shelf)))
    .map(shelf => shelf.closest<HTMLElement>('ytd-rich-section-renderer') ?? shelf))];
}

export function extractVideos(feed: Element, excluded = extractRelevantShelves(feed)): { videos: Video[]; cards: HTMLElement[] } {
  const videos: Video[] = [];
  const cards: HTMLElement[] = [];
  for (const card of Array.from(feed.querySelectorAll<HTMLElement>(CARD_SELECTOR))) {
    if (excluded.some(section => section.contains(card))) continue;
    // Shelves are moved as one native element, never split into individual cards.
    if (card.closest(SHORTS_SHELF_SELECTOR) || card.querySelector(SHORTS_SHELF_SELECTOR)) continue;
    // Only move the outermost renderer; nested lockups belong to that card.
    if (card.parentElement?.closest(CARD_SELECTOR)) continue;
    const links = Array.from(card.querySelectorAll<HTMLAnchorElement>('a[href]'));
    const watch = links.find(link => /\/(watch\?|shorts\/)/.test(link.getAttribute('href') ?? ''));
    if (!watch) continue;
    const url = new URL(watch.href, location.origin);
    const id = url.pathname === '/watch' ? url.searchParams.get('v') : url.pathname.match(/^\/shorts\/([^/]+)/)?.[1];
    if (!id) continue;
    const titleElement = card.querySelector<HTMLElement>('#video-title, #video-title-link, .yt-lockup-metadata-view-model__title, h3 a, .shortsLockupViewModelHostMetadataTitle, .ytShortsLockupViewModelHostMetadataTitle');
    const title = titleElement?.textContent?.trim() || watch.getAttribute('title') || watch.getAttribute('aria-label');
    if (!title) continue;
    const creator = links.find(link => creatorIdentity(link.href) && link.textContent?.trim()) ?? links.find(link => creatorIdentity(link.href));
    videos.push({ id, url: url.href, title,
      creatorId: creator ? creatorIdentity(creator.href) : null,
      creatorName: creator?.textContent?.trim() || 'Creator unavailable',
      isShort: url.pathname.startsWith('/shorts/') || card.matches('ytd-reel-item-renderer, yt-shorts-lockup-view-model, ytm-shorts-lockup-view-model') || !!card.querySelector('ytd-reel-item-renderer, yt-shorts-lockup-view-model, ytm-shorts-lockup-view-model'),
    });
    cards.push(card);
  }
  return { videos, cards };
}

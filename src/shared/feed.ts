import { createDefaultSettings, SHORTS_SECTION_ID, type Settings } from './categories';

export interface Video {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  creatorId: string | null;
  creatorName: string;
  /** YouTube's localized view count and publication age/status, when available. */
  metadata?: string[];
  isShort?: boolean;
}

export function creatorIdentity(href: string): string | null {
  try {
    const url = new URL(href, 'https://www.youtube.com');
    if (!['www.youtube.com', 'youtube.com'].includes(url.hostname)) return null;
    const identity = url.pathname.match(/^\/(channel\/[^/]+|@[^/]+|c\/[^/]+|user\/[^/]+)(?:\/|$)/)?.[1];
    return identity ? (identity.startsWith('@') ? identity.toLowerCase() : identity) : null;
  } catch { return null; }
}

export function parseSettings(value: unknown): Settings {
  if (value === undefined) return createDefaultSettings();
  if (!value || typeof value !== 'object') throw new Error('Invalid saved settings.');
  const data = value as { version?: number; categories?: Settings["categories"]; creatorAssignments?: Record<string, unknown> };
  if ((data.version !== 1 && data.version !== 2) || !Array.isArray(data.categories) || !data.creatorAssignments ||
      typeof data.creatorAssignments !== 'object' || Array.isArray(data.creatorAssignments)) {
    throw new Error('Unsupported saved settings.');
  }
  const ids = new Set<string>();
  for (const category of data.categories) {
    if (!category || typeof category.id !== 'string' || !category.id || category.id === 'other' || category.id === SHORTS_SECTION_ID ||
        ids.has(category.id) || typeof category.name !== 'string' || !category.name.trim()) {
      throw new Error('Invalid saved categories.');
    }
    ids.add(category.id);
  }
  const assignments: Settings['creatorAssignments'] = Object.create(null);
  for (const [creator, assignment] of Object.entries(data.creatorAssignments)) {
    if (data.version === 1) {
      if (!Array.isArray(assignment) || !assignment.every(id => typeof id === 'string')) {
        throw new Error('Invalid saved assignments.');
      }
      // Resolve legacy multi-category memberships in section order.
      assignments[creator] = data.categories.find(category => assignment.includes(category.id))?.id ?? null;
    } else {
      if (assignment !== null && typeof assignment !== 'string') throw new Error('Invalid saved assignment.');
      assignments[creator] = typeof assignment === 'string' && ids.has(assignment) ? assignment : null;
    }
  }
  return { version: 2, categories: data.categories, creatorAssignments: assignments };
}

export function feedSections(settings: Settings) {
  return [...settings.categories, { id: SHORTS_SECTION_ID, name: 'Shorts' }, { id: 'other', name: 'Other' }];
}

export function videoSection(video: Video, settings: Settings): string {
  if (video.isShort) return SHORTS_SECTION_ID;
  const assignment = video.creatorId ? settings.creatorAssignments[video.creatorId] : null;
  return assignment && settings.categories.some(category => category.id === assignment) ? assignment : 'other';
}

export function groupVideos(videos: Video[], settings: Settings): Map<string, Video[]> {
  const groups = new Map(feedSections(settings).map(category => [category.id, [] as Video[]]));
  const seen = new Set<string>();
  for (const video of videos) {
    if (seen.has(video.id)) continue;
    seen.add(video.id);
    groups.get(videoSection(video, settings))!.push(video);
  }
  return groups;
}

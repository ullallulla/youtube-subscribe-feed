import { createDefaultSettings, type Settings } from './categories';

export interface Video {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  creatorId: string | null;
  creatorName: string;
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
  const data = value as Partial<Settings>;
  if (data.version !== 1 || !Array.isArray(data.categories) || !data.creatorAssignments ||
      typeof data.creatorAssignments !== 'object' || Array.isArray(data.creatorAssignments)) {
    throw new Error('Unsupported saved settings.');
  }
  const ids = new Set<string>();
  for (const category of data.categories) {
    if (!category || typeof category.id !== 'string' || !category.id || category.id === 'other' ||
        ids.has(category.id) || typeof category.name !== 'string' || !category.name.trim()) {
      throw new Error('Invalid saved categories.');
    }
    ids.add(category.id);
  }
  const assignments: Record<string, string[]> = Object.create(null);
  for (const [creator, categories] of Object.entries(data.creatorAssignments)) {
    if (!Array.isArray(categories) || !categories.every(id => typeof id === 'string')) {
      throw new Error('Invalid saved assignments.');
    }
    assignments[creator] = [...new Set(categories.filter(id => ids.has(id)))];
  }
  return { version: 1, categories: data.categories, creatorAssignments: assignments };
}

export function groupVideos(videos: Video[], settings: Settings): Map<string, Video[]> {
  const groups = new Map(settings.categories.map(category => [category.id, [] as Video[]]));
  groups.set('other', []);
  const seen = new Set<string>();
  for (const video of videos) {
    if (seen.has(video.id)) continue;
    seen.add(video.id);
    const assignments = video.creatorId ? settings.creatorAssignments[video.creatorId] ?? [] : [];
    const valid = [...new Set(assignments.filter(id => id !== 'other' && groups.has(id)))];
    for (const id of valid.length ? valid : ['other']) groups.get(id)!.push(video);
  }
  return groups;
}

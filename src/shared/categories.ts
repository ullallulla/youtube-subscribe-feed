export interface Category {
  id: string;
  name: string;
}

export interface Settings {
  version: 2;
  /** Array order determines section order. Other is derived and always last. */
  categories: Category[];
  /** One category per creator; null means Other. */
  creatorAssignments: Record<string, string | null>;
}

export function createDefaultSettings(): Settings {
  return {
    version: 2,
    categories: [
      { id: 'reacts', name: 'Reacts' },
      { id: 'gaming', name: 'Gaming' },
      { id: 'tech', name: 'Tech' },
    ],
    creatorAssignments: {},
  };
}

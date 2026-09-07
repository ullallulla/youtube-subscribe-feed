export interface Category {
  id: string;
  name: string;
}

export interface Settings {
  version: 1;
  /** Array order determines section order. Other is derived and always last. */
  categories: Category[];
  /** Creator identifier mapped to category IDs. */
  creatorAssignments: Record<string, string[]>;
}

export function createDefaultSettings(): Settings {
  return {
    version: 1,
    categories: [
      { id: 'reacts', name: 'Reacts' },
      { id: 'gaming', name: 'Gaming' },
      { id: 'tech', name: 'Tech' },
    ],
    creatorAssignments: {},
  };
}

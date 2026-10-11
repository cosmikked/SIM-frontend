/** Query key factories. Lists include their params so each page/sort/filter caches separately. */
export const keys = {
  me: ['me'] as const,
  lookups: {
    programs: ['lookups', 'programs'] as const,
    courses: ['lookups', 'courses'] as const,
    terms: ['lookups', 'terms'] as const,
    rooms: ['lookups', 'rooms'] as const,
    instructors: ['lookups', 'instructors'] as const,
    offerings: ['lookups', 'offerings'] as const,
  },
  list: (resource: string, params: object = {}) => [resource, 'list', params] as const,
  detail: (resource: string, id: number) => [resource, 'detail', id] as const,
  resource: (resource: string) => [resource] as const,
}

/** Lookup lists change rarely; keep them for a while. */
export const LOOKUP_STALE_TIME = 5 * 60_000

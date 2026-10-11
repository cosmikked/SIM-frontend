import type { CourseOffering } from '@/lib/api/types'

export type OfferingTerm = NonNullable<CourseOffering['academic_term']>

/** Distinct terms of the given offerings, newest `start_date` first. */
export function termsFromOfferings(offerings: Iterable<CourseOffering>): OfferingTerm[] {
  const byId = new Map<number, OfferingTerm>()
  for (const offering of offerings) {
    if (offering.academic_term) byId.set(offering.academic_term.id, offering.academic_term)
  }
  return [...byId.values()].sort((a, b) => b.start_date.localeCompare(a.start_date))
}

/**
 * The "current" term: the active one that started last, or, when none is active,
 * the newest term. `terms` must be sorted newest first (see `termsFromOfferings`).
 */
export function pickDefaultTerm(terms: OfferingTerm[]): OfferingTerm | undefined {
  return terms.find((t) => t.status === 'active') ?? terms[0]
}

import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'

import { courseOfferingsApi } from '@/lib/api/endpoints/resources'
import type { CourseOffering } from '@/lib/api/types'
import { keys, LOOKUP_STALE_TIME } from '@/lib/query/keys'
import { termLabel } from '@/lib/format'

/**
 * Students get 403 on /courses, /academic-terms and the offering list, but may open the
 * offerings they are enrolled in. Enrollment rows carry only `course_offering_id`, so fetch
 * those offerings one by one (cached by id) and join in memory. Course and term names come
 * from the `course` / `academic_term` objects the API embeds in an offering.
 */
export function useMyOfferings(offeringIds: number[]) {
  return useMyOfferingsWithStatus(offeringIds).offerings
}

/** Same as `useMyOfferings`, plus `settled`: every fetch has finished (succeeded or failed). */
export function useMyOfferingsWithStatus(offeringIds: number[]) {
  const unique = useMemo(() => [...new Set(offeringIds)], [offeringIds])
  const results = useQueries({
    queries: unique.map((id) => ({
      queryKey: keys.detail('course-offerings', id),
      queryFn: () => courseOfferingsApi.get(id),
      staleTime: LOOKUP_STALE_TIME,
    })),
  })

  return useMemo(
    () => ({
      offerings: new Map<number, CourseOffering>(
        results.flatMap((r) => (r.data ? [[r.data.id, r.data] as const] : [])),
      ),
      settled: results.every((r) => !r.isPending),
    }),
    [results],
  )
}

/** Labels for one offering, falling back to ids while names are not available. */
export function offeringLabels(offering: CourseOffering | undefined, offeringId: number) {
  return {
    code: offering?.course?.course_code ?? `Section #${offeringId}`,
    title: offering?.course?.course_title ?? null,
    section: offering?.section ?? null,
    term: offering?.academic_term ? termLabel(offering.academic_term) : null,
  }
}

import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'

import { enrollmentsApi } from '@/lib/api/endpoints/resources'
import type { Enrollment } from '@/lib/api/types'

import { keys, LOOKUP_STALE_TIME } from './keys'

/**
 * Grade rows carry `enrollment_id` only. Fetch just the enrollments on the current page
 * (at most `per_page`) and cache each by id, like `useStudentsById`.
 */
export function useEnrollmentsById(ids: number[]) {
  const unique = useMemo(() => [...new Set(ids)], [ids])
  const results = useQueries({
    queries: unique.map((id) => ({
      queryKey: keys.detail('enrollments', id),
      queryFn: () => enrollmentsApi.get(id),
      staleTime: LOOKUP_STALE_TIME,
    })),
  })

  return useMemo(
    () => new Map<number, Enrollment>(results.flatMap((r) => (r.data ? [[r.data.id, r.data] as const] : []))),
    [results],
  )
}

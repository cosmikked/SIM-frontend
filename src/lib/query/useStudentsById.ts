import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'

import { studentsApi } from '@/lib/api/endpoints/resources'
import type { Student } from '@/lib/api/types'

import { keys, LOOKUP_STALE_TIME } from './keys'

/**
 * Enrollment rows carry `student_id` only. There can be thousands of students, so instead of
 * preloading them all, fetch just the ones on the current page (at most `per_page`) and cache
 * each by id, so paging back and forth costs nothing.
 */
export function useStudentsById(ids: number[]) {
  const unique = useMemo(() => [...new Set(ids)], [ids])
  const results = useQueries({
    queries: unique.map((id) => ({
      queryKey: keys.detail('students', id),
      queryFn: () => studentsApi.get(id),
      staleTime: LOOKUP_STALE_TIME,
    })),
  })

  return useMemo(
    () => new Map<number, Student>(results.flatMap((r) => (r.data ? [[r.data.id, r.data] as const] : []))),
    [results],
  )
}

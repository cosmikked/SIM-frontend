import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import {
  academicTermsApi,
  coursesApi,
  courseOfferingsApi,
  instructorsApi,
  programsApi,
  roomsApi,
} from '@/lib/api/endpoints/resources'
import type { AcademicTerm, Course, CourseOffering, Instructor, Program, Room } from '@/lib/api/types'

import { keys, LOOKUP_STALE_TIME } from './keys'

const ALL = { per_page: 100 }

function byId<T extends { id: number }>(rows: T[] | undefined): Map<number, T> {
  return new Map((rows ?? []).map((row) => [row.id, row]))
}

/**
 * List responses carry IDs only (no course title, instructor name, ...), so the client
 * fetches the small lookup tables once and joins by id. Pass `enabled` per role: students
 * get 403 on programs, courses and terms.
 */
export function useLookups(
  enabled: Partial<Record<'programs' | 'courses' | 'terms' | 'rooms' | 'instructors' | 'offerings', boolean>> = {},
) {
  const opts = { staleTime: LOOKUP_STALE_TIME }
  const programs = useQuery({
    queryKey: keys.lookups.programs,
    queryFn: () => programsApi.list(ALL),
    enabled: enabled.programs ?? false,
    ...opts,
  })
  const courses = useQuery({
    queryKey: keys.lookups.courses,
    queryFn: () => coursesApi.list(ALL),
    enabled: enabled.courses ?? false,
    ...opts,
  })
  const terms = useQuery({
    queryKey: keys.lookups.terms,
    queryFn: () => academicTermsApi.list(ALL),
    enabled: enabled.terms ?? false,
    ...opts,
  })
  const rooms = useQuery({
    queryKey: keys.lookups.rooms,
    queryFn: () => roomsApi.list(ALL),
    enabled: enabled.rooms ?? false,
    ...opts,
  })
  const instructors = useQuery({
    queryKey: keys.lookups.instructors,
    queryFn: () => instructorsApi.list(ALL),
    enabled: enabled.instructors ?? false,
    ...opts,
  })
  const offerings = useQuery({
    queryKey: keys.lookups.offerings,
    queryFn: () => courseOfferingsApi.list(ALL),
    enabled: enabled.offerings ?? false,
    ...opts,
  })

  return useMemo(
    () => ({
      programs: byId<Program>(programs.data?.items),
      courses: byId<Course>(courses.data?.items),
      terms: byId<AcademicTerm>(terms.data?.items),
      rooms: byId<Room>(rooms.data?.items),
      instructors: byId<Instructor>(instructors.data?.items),
      offerings: byId<CourseOffering>(offerings.data?.items),
      isLoading:
        programs.isLoading ||
        courses.isLoading ||
        terms.isLoading ||
        rooms.isLoading ||
        instructors.isLoading ||
        offerings.isLoading,
    }),
    [programs, courses, terms, rooms, instructors, offerings],
  )
}

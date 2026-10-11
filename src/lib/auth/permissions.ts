import type { Role } from '@/lib/api/types'

/**
 * Screen areas, from PRD section 7. Authorization is enforced by the API; this only
 * decides what the UI offers, so a user is never shown something that would 403.
 */
export type Area =
  | 'dashboard'
  | 'users'
  | 'programs'
  | 'courses'
  | 'academic-terms'
  | 'students'
  | 'course-offerings'
  | 'enrollments'
  | 'grades'
  | 'grading'
  | 'my-offerings'
  | 'my-enrollments'
  | 'my-grades'
  | 'my-record'

const registrarAreas: Area[] = [
  'dashboard',
  'programs',
  'courses',
  'academic-terms',
  'students',
  'course-offerings',
  'enrollments',
  'grades',
]

const AREAS_BY_ROLE: Record<Role, readonly Area[]> = {
  administrator: [...registrarAreas, 'users', 'grading'],
  registrar: registrarAreas,
  instructor: ['my-offerings'],
  student: ['my-enrollments', 'my-grades', 'my-record'],
}

export function canAccess(role: Role, area: Area): boolean {
  return AREAS_BY_ROLE[role].includes(area)
}

/** Where each role lands after login / on "/". */
export function homePath(role: Role): string {
  switch (role) {
    case 'administrator':
    case 'registrar':
      return '/dashboard'
    case 'instructor':
      return '/my/offerings'
    case 'student':
      return '/my/enrollments'
  }
}

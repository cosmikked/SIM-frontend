/**
 * Hand-written API types. The shapes come from backend/app/Http/Resources and the
 * Form Requests; the OpenAPI spec (Scramble) is too weak for grades and envelopes.
 * Dates are ISO strings; `YYYY-MM-DD` where the backend uses toDateString().
 */

// ---- Enums (DB enums / validation lists; there is no app/Enums) ----
export const ROLES = ['administrator', 'registrar', 'instructor', 'student'] as const
export type Role = (typeof ROLES)[number]

export const ROLE_LABELS: Record<Role, string> = {
  administrator: 'Administrator',
  registrar: 'Registrar',
  instructor: 'Instructor',
  student: 'Student',
}

export const ACTIVE_STATUSES = ['active', 'inactive'] as const
export type ActiveStatus = (typeof ACTIVE_STATUSES)[number]

export const STUDENT_STATUSES = ['regular', 'irregular', 'extendee'] as const
export type StudentStatus = (typeof STUDENT_STATUSES)[number]

export const ENROLLMENT_STATUSES = ['enrolled', 'dropped', 'completed'] as const
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number]

export const OFFERING_STATUSES = ['open', 'closed', 'cancelled'] as const
export type OfferingStatus = (typeof OFFERING_STATUSES)[number]

// StoreAcademicTermRequest: the value is `MidYear`, not `Summer`.
export const TERM_NAMES = ['First Semester', 'Second Semester', 'MidYear'] as const
export type TermName = (typeof TERM_NAMES)[number]

export const GRADE_PERIODS = ['midterm', 'final'] as const
export type GradePeriod = (typeof GRADE_PERIODS)[number]

export type PublicationStatus = 'draft' | 'published'

// StoreCourseOfferingRequest only requires a string; the UI offers the school week.
export const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number]

// StoreStudentRequest: year_level between 1 and 4.
export const YEAR_LEVELS = [1, 2, 3, 4] as const

// ---- Envelopes ----
export interface PaginationLinks {
  first: string | null
  last: string | null
  prev: string | null
  next: string | null
}

export interface PaginationMeta {
  current_page: number
  from: number | null
  last_page: number
  per_page: number
  to: number | null
  total: number
  path: string
}

export interface Paginated<T> {
  items: T[]
  links: PaginationLinks
  meta: PaginationMeta
}

export interface ListParams {
  page?: number
  per_page?: number
  /** Comma-separated; `-` prefix for descending. Only existing columns, or the API returns 500. */
  sort?: string
  search?: string
}

// ---- Resources ----
export interface User {
  id: number
  name: string
  email: string
  role: Role
  status: ActiveStatus
  /** Present for students on /auth/me; may be null (the student@ dev account has no record). */
  student_id?: number | null
  created_at: string
  updated_at: string
}

export interface Student {
  id: number
  student_number: string
  first_name: string
  middle_name: string | null
  last_name: string
  suffix: string | null
  birth_date: string
  email: string
  contact_number: string | null
  address: string | null
  program_id: number
  year_level: number
  status: StudentStatus
  created_at: string
  updated_at: string
}

export type StudentSummary = Pick<
  Student,
  'id' | 'student_number' | 'first_name' | 'middle_name' | 'last_name' | 'suffix' | 'program_id' | 'year_level'
>

export interface Program {
  id: number
  code: string
  name: string
  description: string | null
  status: ActiveStatus
  created_at: string
  updated_at: string
}

export interface Course {
  id: number
  course_code: string
  course_title: string
  description: string | null
  units: number
  status: ActiveStatus
  created_at: string
  updated_at: string
}

export interface AcademicTerm {
  id: number
  academic_year: string
  term: TermName
  start_date: string
  end_date: string
  status: ActiveStatus
  midterm_grading_deadline: string | null
  final_grading_deadline: string | null
  inc_completion_deadline: string | null
  created_at: string
  updated_at: string
}

export interface Schedule {
  id: number
  room_id: number
  day_of_week: string
  /** HH:MM:SS */
  start_time: string
  end_time: string
}

export interface CourseOffering {
  id: number
  course_id: number
  academic_term_id: number
  instructor_id: number | null
  section: string
  capacity: number
  status: OfferingStatus
  schedules: Schedule[]
  /**
   * Embedded by the API so instructors (who get 403 on /courses and /academic-terms) can
   * still show a title and the grading deadlines. Staff screens may rely on lookups instead.
   */
  course?: Pick<Course, 'id' | 'course_code' | 'course_title' | 'units'>
  academic_term?: Pick<
    AcademicTerm,
    | 'id'
    | 'academic_year'
    | 'term'
    | 'status'
    | 'start_date'
    | 'end_date'
    | 'midterm_grading_deadline'
    | 'final_grading_deadline'
    | 'inc_completion_deadline'
  >
  created_at: string
  updated_at: string
}

/** A schedule row as sent to the API (no `id`; times are HH:MM:SS). */
export type ScheduleInput = Omit<Schedule, 'id'>

/** Body of POST/PATCH /course-offerings. `course_id` and `academic_term_id` are create-only. */
export interface CourseOfferingInput {
  course_id?: number
  academic_term_id?: number
  instructor_id: number
  section: string
  capacity: number
  status: OfferingStatus
  schedules: ScheduleInput[]
}

/**
 * Grade fields are hidden by the API until a period is published (students and
 * registrars), so every score/status field is optional.
 */
export interface Grade {
  id: number
  enrollment_id: number
  midterm_raw_score?: number | null
  midterm_equivalent_grade?: number | null
  finalterm_raw_score?: number | null
  finalterm_equivalent_grade?: number | null
  final_raw_score?: number | null
  final_equivalent_grade?: number | null
  re_exam_raw_score?: number | null
  re_exam_equivalent_grade?: number | null
  remarks?: string | null
  is_inc?: boolean
  inc_expiration_date?: string | null
  midterm_status?: PublicationStatus
  midterm_published_at?: string | null
  final_status?: PublicationStatus
  final_published_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface Enrollment {
  id: number
  student_id: number
  course_offering_id: number
  enrollment_date: string
  status: EnrollmentStatus
  /** Only on the offering roster endpoint. */
  student?: StudentSummary
  grade?: Grade | null
  created_at: string
  updated_at: string
}

export interface Instructor {
  id: number
  name: string
  email: string
  status: ActiveStatus
}

export interface Room {
  id: number
  code: string
  building: string
  capacity: number
}

export interface AcademicRecordTerm {
  academic_term: string
  enrollments: {
    course_code: string
    course_title: string
    units: number
    final_equivalent_grade: number | null
    remarks: string | null
  }[]
}

export interface BulkPublishResult {
  period: GradePeriod
  published: number
  skipped: number
}

import { api, getList, getOne } from '../client'
import type {
  AcademicTermValues,
  CourseValues,
  EnrollmentValues,
  ProgramValues,
  StudentBody,
  UserBody,
} from '../schemas'
import type {
  AcademicRecordTerm,
  AcademicTerm,
  ActiveStatus,
  Course,
  CourseOffering,
  CourseOfferingInput,
  Enrollment,
  EnrollmentStatus,
  Grade,
  GradePeriod,
  Instructor,
  ListParams,
  OfferingStatus,
  Paginated,
  Program,
  Role,
  Room,
  Student,
  StudentStatus,
  User,
  BulkPublishResult,
  TermName,
} from '../types'
import { crud } from './crud'

export const usersApi = crud<User, { role?: Role; status?: ActiveStatus }, UserBody>('/users')

export const programsApi = crud<Program, { status?: ActiveStatus }, ProgramValues>('/programs')

export const coursesApi = crud<Course, { status?: ActiveStatus }, CourseValues>('/courses')

/** Fields the deadlines endpoint accepts; omit one to leave it unchanged (null is rejected). */
export type GradingDeadlinesBody = Partial<
  Pick<AcademicTerm, 'midterm_grading_deadline' | 'final_grading_deadline' | 'inc_completion_deadline'>
>

export const academicTermsApi = {
  ...crud<AcademicTerm, { status?: ActiveStatus; academic_year?: string; term?: TermName }, AcademicTermValues>(
    '/academic-terms',
  ),
  updateDeadlines: async (id: number, body: GradingDeadlinesBody): Promise<AcademicTerm> =>
    (await api.patch<AcademicTerm>(`/academic-terms/${id}/grading-deadlines`, body)).data,
}

export const studentsApi = {
  ...crud<Student, { status?: StudentStatus; program_id?: number; year_level?: number }, StudentBody>('/students'),
  grades: (id: number, params: ListParams & { academic_term_id?: number } = {}): Promise<Paginated<Grade>> =>
    getList<Grade>(`/students/${id}/grades`, params as Record<string, string | number>),
  enrollments: (id: number, params: ListParams = {}): Promise<Paginated<Enrollment>> =>
    getList<Enrollment>(`/students/${id}/enrollments`, params as Record<string, string | number>),
  /** Not paginated. */
  academicRecord: (id: number): Promise<AcademicRecordTerm[]> =>
    getOne<AcademicRecordTerm[]>(`/students/${id}/academic-record`),
}

export const courseOfferingsApi = {
  ...crud<
    CourseOffering,
    { status?: OfferingStatus; course_id?: number; academic_term_id?: number; instructor_id?: number },
    CourseOfferingInput
  >('/course-offerings'),
  /** Grading-sheet roster: enrollments with student + grade. Use per_page=100. */
  roster: (id: number, params: ListParams & { status?: EnrollmentStatus } = {}): Promise<Paginated<Enrollment>> =>
    getList<Enrollment>(`/course-offerings/${id}/enrollments`, params as Record<string, string | number>),
}

/** Create takes `EnrollmentValues`; a class is dropped with `update(id, { status: 'dropped' })`. */
export const enrollmentsApi = crud<
  Enrollment,
  { status?: EnrollmentStatus; student_id?: number; course_offering_id?: number },
  EnrollmentValues & { status?: EnrollmentStatus }
>('/enrollments')

export interface BulkGradeRow {
  enrollment_id: number
  midterm_raw_score?: number | null
  finalterm_raw_score?: number | null
  re_exam_raw_score?: number | null
  is_inc?: boolean
}

export const gradesApi = {
  ...crud<Grade, { is_inc?: boolean; enrollment_id?: number }>('/grades'),
  publish: async (gradeId: number, period: GradePeriod): Promise<Grade> =>
    (await api.post<Grade>(`/grades/${gradeId}/publish`, { period })).data,
  /** Save drafts for a whole offering. Responds with no `data`. */
  bulkSave: async (offeringId: number, grades: BulkGradeRow[]): Promise<string> =>
    (await api.put<void>(`/course-offerings/${offeringId}/grades`, { grades })).message ?? '',
  bulkPublish: async (offeringId: number, period: GradePeriod): Promise<BulkPublishResult> =>
    (await api.post<BulkPublishResult>(`/course-offerings/${offeringId}/grades/publish`, { period })).data,
}

export const roomsApi = {
  list: (params: ListParams & { building?: string } = {}): Promise<Paginated<Room>> =>
    getList<Room>('/rooms', params as Record<string, string | number>),
}

export const instructorsApi = {
  list: (params: ListParams & { status?: ActiveStatus } = {}): Promise<Paginated<Instructor>> =>
    getList<Instructor>('/instructors', params as Record<string, string | number>),
}

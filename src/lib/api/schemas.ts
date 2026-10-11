import { z } from 'zod'

import {
  ACTIVE_STATUSES,
  DAYS_OF_WEEK,
  GRADE_PERIODS,
  OFFERING_STATUSES,
  ROLES,
  STUDENT_STATUSES,
  TERM_NAMES,
} from './types'

// Mirrors the Form Requests in backend/app/Http/Requests. The server stays the
// source of truth: these only give instant feedback, 422s are still mapped on top.

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})
export type LoginValues = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
})
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8, 'At least 8 characters'),
    password_confirmation: z.string().min(1, 'Confirm your password'),
  })
  .refine((v) => v.password === v.password_confirmation, {
    path: ['password_confirmation'],
    message: 'Passwords do not match',
  })
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>

export const profileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().min(1, 'Email is required').email('Enter a valid email').max(255),
})
export type ProfileValues = z.infer<typeof profileSchema>

export const programSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  status: z.enum(ACTIVE_STATUSES),
})
export type ProgramValues = z.infer<typeof programSchema>

export const courseSchema = z.object({
  course_code: z.string().min(1, 'Course code is required'),
  course_title: z.string().min(1, 'Course title is required'),
  description: z.string().optional(),
  units: z
    .number({ error: 'Units must be a number' })
    .int('Units must be a whole number')
    .min(1, 'At least 1 unit')
    .max(9, 'At most 9 units'),
  status: z.enum(ACTIVE_STATUSES),
})
export type CourseValues = z.infer<typeof courseSchema>

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// StoreAcademicTermRequest + ConsecutiveAcademicYear: "2024-2025", the second year follows the first.
export const academicTermSchema = z
  .object({
    academic_year: z
      .string()
      .regex(/^\d{4}-\d{4}$/, 'Use the format 2024-2025')
      .refine((v) => Number(v.slice(5)) === Number(v.slice(0, 4)) + 1, 'The years must be consecutive'),
    term: z.enum(TERM_NAMES),
    start_date: z.string().regex(DATE_RE, 'Start date is required'),
    end_date: z.string().regex(DATE_RE, 'End date is required'),
    status: z.enum(ACTIVE_STATUSES),
  })
  .refine((v) => !DATE_RE.test(v.start_date) || !DATE_RE.test(v.end_date) || v.end_date > v.start_date, {
    path: ['end_date'],
    message: 'End date must be after the start date',
  })
export type AcademicTermValues = z.infer<typeof academicTermSchema>

// UpdateGradingDeadlinesRequest: each later date is on or after the earlier one.
// Midterm/final are date-times (`datetime-local`), INC completion is a date.
export const gradingDeadlinesSchema = z
  .object({
    midterm_grading_deadline: z.string(),
    final_grading_deadline: z.string(),
    inc_completion_deadline: z.string(),
  })
  .superRefine((v, ctx) => {
    const order = [
      ['midterm_grading_deadline', v.midterm_grading_deadline],
      ['final_grading_deadline', v.final_grading_deadline],
      ['inc_completion_deadline', v.inc_completion_deadline],
    ] as const
    let previous: { label: string; time: number } | undefined
    for (const [field, value] of order) {
      if (!value) continue
      // A bare date would parse as UTC while datetime-local parses as local; compare both as local.
      const time = Date.parse(value.length === 10 ? `${value}T00:00` : value)
      if (previous && time < previous.time) {
        ctx.addIssue({ code: 'custom', path: [field], message: `Must be on or after the ${previous.label}` })
      }
      previous = { label: field.startsWith('midterm') ? 'midterm deadline' : 'final deadline', time }
    }
  })
export type GradingDeadlinesValues = z.infer<typeof gradingDeadlinesSchema>

const TIME_RE = /^\d{2}:\d{2}$/

export const scheduleRowSchema = z
  .object({
    room_id: z.number({ error: 'Choose a room' }).int().positive('Choose a room'),
    day_of_week: z.enum(DAYS_OF_WEEK, { error: 'Choose a day' }),
    // <input type="time"> values (HH:MM); converted to HH:MM:SS when sent.
    start_time: z.string().regex(TIME_RE, 'Start time is required'),
    end_time: z.string().regex(TIME_RE, 'End time is required'),
  })
  .refine((v) => !TIME_RE.test(v.start_time) || !TIME_RE.test(v.end_time) || v.end_time > v.start_time, {
    path: ['end_time'],
    message: 'End time must be after the start time',
  })

// StoreCourseOfferingRequest. Room/instructor conflicts against OTHER offerings are only
// known to the server (422 on `schedules`); overlaps inside this list are caught here.
export const courseOfferingSchema = z
  .object({
    course_id: z.number({ error: 'Choose a course' }).int().positive('Choose a course'),
    academic_term_id: z.number({ error: 'Choose a term' }).int().positive('Choose a term'),
    instructor_id: z.number({ error: 'Choose an instructor' }).int().positive('Choose an instructor'),
    section: z.string().min(1, 'Section is required'),
    capacity: z.number({ error: 'Capacity must be a number' }).int('Whole number').min(1, 'At least 1'),
    status: z.enum(OFFERING_STATUSES),
    schedules: z.array(scheduleRowSchema).min(1, 'Add at least one schedule'),
  })
  .superRefine((v, ctx) => {
    v.schedules.forEach((row, i) => {
      const clash = v.schedules.findIndex(
        (other, j) =>
          j < i &&
          other.day_of_week === row.day_of_week &&
          other.start_time < row.end_time &&
          row.start_time < other.end_time,
      )
      if (clash !== -1) {
        ctx.addIssue({
          code: 'custom',
          path: ['schedules', i, 'start_time'],
          message: `Overlaps schedule ${clash + 1} on ${row.day_of_week}`,
        })
      }
    })
  })
export type CourseOfferingValues = z.infer<typeof courseOfferingSchema>

// StoreStudentRequest. Student accounts are created together with the student (PRD 5.6).
export const studentSchema = z.object({
  student_number: z.string().min(1, 'Student number is required'),
  first_name: z.string().min(1, 'First name is required'),
  middle_name: z.string(),
  last_name: z.string().min(1, 'Last name is required'),
  suffix: z.string(),
  birth_date: z
    .string()
    .regex(DATE_RE, 'Birth date is required')
    .refine((v) => !DATE_RE.test(v) || v < new Date().toISOString().slice(0, 10), 'Birth date must be in the past'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  contact_number: z.string().min(1, 'Contact number is required'),
  address: z.string(),
  program_id: z.number({ error: 'Choose a program' }).int().positive('Choose a program'),
  year_level: z.number({ error: 'Choose a year level' }).int().min(1).max(4),
  status: z.enum(STUDENT_STATUSES),
})
export type StudentValues = z.infer<typeof studentSchema>

/** What the API receives: blank optional fields go as null (the rules are `nullable`). */
export type StudentBody = Omit<StudentValues, 'middle_name' | 'suffix' | 'address'> & {
  middle_name: string | null
  suffix: string | null
  address: string | null
}

export function toStudentBody(values: StudentValues): StudentBody {
  return {
    ...values,
    middle_name: values.middle_name.trim() || null,
    suffix: values.suffix.trim() || null,
    address: values.address.trim() || null,
  }
}

// StoreEnrollmentRequest. `status` is left out so the server default (`enrolled`) applies.
// Duplicate / full / not-open / date-before-term-start are only known to the server (422 on the field).
export const enrollmentSchema = z.object({
  student_id: z.number({ error: 'Choose a student' }).int().positive('Choose a student'),
  course_offering_id: z.number({ error: 'Choose a section' }).int().positive('Choose a section'),
  enrollment_date: z.string().regex(DATE_RE, 'Enrollment date is required'),
})
export type EnrollmentValues = z.infer<typeof enrollmentSchema>

// StoreUserRequest / UpdateUserRequest. Editing leaves the password blank to keep the current one.
const userFields = {
  name: z.string().trim().min(1, 'Name is required').max(255),
  email: z.string().min(1, 'Email is required').email('Enter a valid email').max(255),
  role: z.enum(ROLES),
  status: z.enum(ACTIVE_STATUSES),
}
export const userSchema = z.object({
  ...userFields,
  password: z.string().min(8, 'Password must be at least 8 characters'),
})
export const userUpdateSchema = z.object({
  ...userFields,
  password: z.string().refine((v) => v === '' || v.length >= 8, 'Password must be at least 8 characters'),
})
export type UserValues = z.infer<typeof userSchema>

/** What the API receives: a blank password is left out so the existing one is kept. */
export type UserBody = Omit<UserValues, 'password'> & { password?: string }

export function toUserBody(values: UserValues): UserBody {
  const { password, ...rest } = values
  return password ? { ...rest, password } : rest
}

/** Raw scores only (0-100). Never send remarks, equivalent grades or final_raw_score. */
export const gradeScoreSchema = z.number().min(0).max(100).nullable()

export const publishGradeSchema = z.object({ period: z.enum(GRADE_PERIODS) })

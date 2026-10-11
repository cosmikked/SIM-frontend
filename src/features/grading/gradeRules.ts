import type { BulkGradeRow } from '@/lib/api/endpoints/resources'
import type { CourseOffering, Enrollment, Grade, Role } from '@/lib/api/types'

/** The editable inputs of one grading-sheet row. */
export const SCORE_FIELDS = ['midterm_raw_score', 'finalterm_raw_score', 're_exam_raw_score'] as const
export type ScoreField = (typeof SCORE_FIELDS)[number]
export type GradeField = ScoreField | 'is_inc'

/** What the user has typed but not saved yet: raw score text (`''` = cleared) and the INC flag. */
export type RowEdits = Partial<Record<ScoreField, string>> & { is_inc?: boolean }
export type SheetEdits = Record<number, RowEdits>

/** Deadlines come from the embedded term; absent when the API does not embed it yet. */
export interface SheetDeadlines {
  midterm: Date | null
  final: Date | null
  inc: Date | null
}

export function deadlinesOf(term: CourseOffering['academic_term']): SheetDeadlines {
  const parse = (value: string | null | undefined) => (value ? new Date(value) : null)
  return {
    midterm: parse(term?.midterm_grading_deadline),
    final: parse(term?.final_grading_deadline),
    inc: parse(term?.inc_completion_deadline),
  }
}

/** The INC deadline is a date: it runs to the end of that day. */
function endOfDay(date: Date): Date {
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  return end
}

export function isPast(deadline: Date | null, now = new Date()): boolean {
  return deadline !== null && now.getTime() > deadline.getTime()
}

export function isIncPast(deadline: Date | null, now = new Date()): boolean {
  return deadline !== null && now.getTime() > endOfDay(deadline).getTime()
}

export function isMidtermPublished(grade: Grade | null | undefined): boolean {
  return grade?.midterm_status === 'published'
}

export function isFinalPublished(grade: Grade | null | undefined): boolean {
  return grade?.final_status === 'published'
}

/** A published INC grade the instructor may still complete (PRD 5.9 exception b). */
export function isIncCompletion(grade: Grade | null | undefined): boolean {
  return isFinalPublished(grade) && grade?.is_inc === true
}

/** Stored score to the text shown in the input. */
export function scoreText(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value)
}

export function isGradable(enrollment: Enrollment): boolean {
  return enrollment.status === 'enrolled'
}

export interface FieldState {
  disabled: boolean
  /** Why the field is locked; shown as a tooltip / screen-reader hint. */
  reason?: string
}

interface LockContext {
  role: Role
  grade: Grade | null | undefined
  enrollment: Enrollment
  deadlines: SheetDeadlines
}

const OPEN: FieldState = { disabled: false }

/**
 * Which inputs the API would accept (PRD 5.9). The server is the source of truth and
 * still answers 403/422; this only stops the UI offering what it knows will be rejected.
 * Administrators are never locked and never limited by deadlines.
 */
export function fieldState(field: GradeField, { role, grade, enrollment, deadlines }: LockContext): FieldState {
  if (!isGradable(enrollment)) {
    return { disabled: true, reason: `Enrollment is ${enrollment.status}; it cannot be graded.` }
  }
  if (role === 'administrator') return OPEN

  const midtermPublished = isMidtermPublished(grade)
  const finalPublished = isFinalPublished(grade)

  switch (field) {
    case 'midterm_raw_score':
      if (midtermPublished || finalPublished) return { disabled: true, reason: 'Midterm is published.' }
      if (isPast(deadlines.midterm)) return { disabled: true, reason: 'The midterm grading deadline has passed.' }
      return OPEN
    case 'finalterm_raw_score':
      if (isIncCompletion(grade)) {
        return isIncPast(deadlines.inc) ? { disabled: true, reason: 'The INC completion deadline has passed.' } : OPEN
      }
      if (finalPublished) return { disabled: true, reason: 'Final is published.' }
      if (isPast(deadlines.final)) return { disabled: true, reason: 'The final grading deadline has passed.' }
      return OPEN
    case 're_exam_raw_score': {
      if (grade?.final_equivalent_grade !== 4) {
        return { disabled: true, reason: 'Re-exam applies only to a Conditional (4.0) result.' }
      }
      if (finalPublished && grade.re_exam_raw_score !== null && grade.re_exam_raw_score !== undefined) {
        return { disabled: true, reason: 'The re-exam result is already recorded.' }
      }
      return OPEN
    }
    case 'is_inc':
      if (isIncCompletion(grade)) {
        return isIncPast(deadlines.inc) ? { disabled: true, reason: 'The INC completion deadline has passed.' } : OPEN
      }
      if (finalPublished) return { disabled: true, reason: 'Final is published.' }
      if (isPast(deadlines.final)) return { disabled: true, reason: 'The final grading deadline has passed.' }
      return OPEN
  }
}

/** Current value of a field: the unsaved edit if there is one, else what the server holds. */
export function scoreValue(field: ScoreField, grade: Grade | null | undefined, edits: RowEdits | undefined): string {
  return edits?.[field] ?? scoreText(grade?.[field])
}

export function incValue(grade: Grade | null | undefined, edits: RowEdits | undefined): boolean {
  return edits?.is_inc ?? grade?.is_inc ?? false
}

/** Parses an input value; `undefined` when it is not a number in the 0–100 range. */
export function parseScore(text: string): number | null | undefined {
  const trimmed = text.trim()
  if (trimmed === '') return null
  const value = Number(trimmed)
  if (!Number.isFinite(value) || value < 0 || value > 100) return undefined
  return value
}

/** Client-side check shown inline; the API validates again. */
export function scoreError(text: string): string | undefined {
  if (text.trim() === '') return undefined
  return parseScore(text) === undefined ? 'Enter a number from 0 to 100.' : undefined
}

/**
 * Applies one change to the edit map, dropping the entry again when it equals what is
 * stored. Only fields that really changed are sent: the API treats `null` against a stored
 * value as a change, so untouched fields must stay out of the request.
 */
export function withEdit(
  edits: SheetEdits,
  enrollmentId: number,
  grade: Grade | null | undefined,
  field: GradeField,
  next: string | boolean,
): SheetEdits {
  const row: RowEdits = { ...edits[enrollmentId] }

  if (field === 'is_inc') {
    if (next === (grade?.is_inc ?? false)) delete row.is_inc
    else row.is_inc = next as boolean
  } else if (next === scoreText(grade?.[field])) {
    delete row[field]
  } else {
    row[field] = next as string
  }

  const rest = { ...edits }
  if (Object.keys(row).length === 0) delete rest[enrollmentId]
  else rest[enrollmentId] = row
  return rest
}

export function editedCount(edits: SheetEdits): number {
  return Object.keys(edits).length
}

export function hasInvalidScore(edits: SheetEdits): boolean {
  return Object.values(edits).some((row) => SCORE_FIELDS.some((field) => row[field] !== undefined && scoreError(row[field]!)))
}

/** The request body of `PUT /course-offerings/{id}/grades`: edited rows, edited fields only. */
export function toBulkRows(edits: SheetEdits): BulkGradeRow[] {
  return Object.entries(edits).map(([id, row]) => {
    const body: BulkGradeRow = { enrollment_id: Number(id) }
    for (const field of SCORE_FIELDS) {
      const text = row[field]
      if (text !== undefined) body[field] = parseScore(text) ?? null
    }
    if (row.is_inc !== undefined) body.is_inc = row.is_inc
    return body
  })
}

/** Server messages keyed by enrollment id then field, from `grades.{index}.{field}` 422 keys. */
export type RowErrors = Record<number, Partial<Record<GradeField, string>>>

export function mapBulkErrors(errors: Record<string, string[]>, rows: BulkGradeRow[]): RowErrors {
  const result: RowErrors = {}
  for (const [key, messages] of Object.entries(errors)) {
    const match = /^grades\.(\d+)\.(\w+)$/.exec(key)
    if (!match) continue
    const row = rows[Number(match[1])]
    if (!row) continue
    result[row.enrollment_id] = { ...result[row.enrollment_id], [match[2] as GradeField]: messages[0] }
  }
  return result
}

export interface PublishReadiness {
  /** Rows that would be released for the period. */
  ready: number
  /** Gradable rows that lack the score the period needs. */
  missing: number
  /** Rows already released. */
  published: number
}

/** Mirrors the server's publish preconditions (PRD 5.9) to explain what the button will do. */
export function publishReadiness(enrollments: Enrollment[], period: 'midterm' | 'final'): PublishReadiness {
  let ready = 0
  let missing = 0
  let published = 0

  for (const enrollment of enrollments) {
    if (!isGradable(enrollment)) continue
    const grade = enrollment.grade

    if (period === 'midterm') {
      if (isMidtermPublished(grade)) published++
      else if (grade && grade.midterm_raw_score !== null && grade.midterm_raw_score !== undefined) ready++
      else missing++
    } else {
      if (isFinalPublished(grade)) published++
      else if (
        grade &&
        grade.midterm_raw_score !== null &&
        grade.midterm_raw_score !== undefined &&
        ((grade.finalterm_raw_score !== null && grade.finalterm_raw_score !== undefined) || grade.is_inc)
      ) {
        ready++
      } else missing++
    }
  }

  return { ready, missing, published }
}

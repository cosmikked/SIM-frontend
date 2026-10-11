import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Lock, Save, Send } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { SearchInput } from '@/components/data-table/SearchInput'
import { MonoId } from '@/components/MonoId'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ApiError } from '@/lib/api/client'
import { courseOfferingsApi, gradesApi, type BulkGradeRow } from '@/lib/api/endpoints/resources'
import type { Enrollment, GradePeriod } from '@/lib/api/types'
import { useCurrentUser } from '@/lib/auth/useAuth'
import { formatDate, formatDateTime, studentName, termLabel } from '@/lib/format'
import { handleApiError } from '@/lib/forms/applyApiErrors'
import { useLeaveGuard } from '@/lib/forms/useDiscardGuard'
import { keys } from '@/lib/query/keys'
import { useLookups } from '@/lib/query/useLookups'
import { cn } from '@/lib/utils'

import {
  deadlinesOf,
  editedCount,
  fieldState,
  hasInvalidScore,
  incValue,
  isFinalPublished,
  isGradable,
  isIncPast,
  isMidtermPublished,
  isPast,
  mapBulkErrors,
  publishReadiness,
  scoreError,
  scoreValue,
  toBulkRows,
  withEdit,
  type GradeField,
  type RowErrors,
  type ScoreField,
  type SheetEdits,
} from './gradeRules'

const ROSTER_PAGE_SIZE = 100

function fmt(value: number | null | undefined, digits?: number): string {
  if (value === null || value === undefined) return '—'
  return digits === undefined ? String(value) : value.toFixed(digits)
}

export function GradingSheetPage() {
  const { id } = useParams()
  const offeringId = Number(id)
  const queryClient = useQueryClient()
  const user = useCurrentUser()
  const isAdmin = user.role === 'administrator'

  // Administrators can read the catalog endpoints; instructors cannot (403), so they rely on
  // the `course` / `academic_term` objects embedded in the offering.
  const lookups = useLookups({ courses: isAdmin, terms: isAdmin })

  const [edits, setEdits] = useState<SheetEdits>({})
  const [rowErrors, setRowErrors] = useState<RowErrors>({})
  const [publishing, setPublishing] = useState<GradePeriod | null>(null)
  const [search, setSearch] = useState('')

  const offeringQuery = useQuery({
    queryKey: keys.detail('course-offerings', offeringId),
    queryFn: () => courseOfferingsApi.get(offeringId),
    enabled: Number.isFinite(offeringId),
  })
  const rosterQuery = useQuery({
    queryKey: keys.list('course-offerings-roster', { id: offeringId }),
    queryFn: () => courseOfferingsApi.roster(offeringId, { per_page: ROSTER_PAGE_SIZE }),
    enabled: Number.isFinite(offeringId),
  })

  const offering = offeringQuery.data
  const course = offering?.course ?? (offering ? lookups.courses.get(offering.course_id) : undefined)
  const term = offering?.academic_term ?? (offering ? lookups.terms.get(offering.academic_term_id) : undefined)
  const deadlines = useMemo(() => deadlinesOf(term), [term])

  const enrollments = useMemo(
    () =>
      [...(rosterQuery.data?.items ?? [])].sort((a, b) =>
        a.student && b.student ? studentName(a.student).localeCompare(studentName(b.student)) : a.id - b.id,
      ),
    [rosterQuery.data],
  )
  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return enrollments
    return enrollments.filter(
      (e) =>
        e.student &&
        `${e.student.student_number} ${studentName(e.student)}`.toLowerCase().includes(needle),
    )
  }, [enrollments, search])

  const dirtyRows = editedCount(edits)
  const { confirmProps: leaveProps } = useLeaveGuard(dirtyRows > 0)

  function refreshRoster() {
    queryClient.invalidateQueries({ queryKey: keys.resource('course-offerings-roster') })
  }

  const save = useMutation({
    mutationFn: (rows: BulkGradeRow[]) => gradesApi.bulkSave(offeringId, rows),
    onSuccess: () => {
      toast.success('Drafts saved.')
      setEdits({})
      setRowErrors({})
      refreshRoster()
    },
    onError: (error, rows) => {
      // Bulk save is all-or-nothing: nothing was stored. Keep the edits and mark the bad rows.
      if (error instanceof ApiError && error.status === 422 && Object.keys(error.errors).length > 0) {
        const mapped = mapBulkErrors(error.errors, rows)
        setRowErrors(mapped)
        toast.error(
          Object.keys(mapped).length > 0
            ? 'Some scores were rejected. Nothing was saved; fix the marked rows and save again.'
            : error.message,
        )
        return
      }
      handleApiError(error)
    },
  })

  const publish = useMutation({
    mutationFn: (period: GradePeriod) => gradesApi.bulkPublish(offeringId, period),
    onSuccess: (result) => {
      const label = result.period === 'midterm' ? 'Midterm' : 'Final'
      const skipped = result.skipped > 0 ? `, ${result.skipped} skipped (missing scores)` : ''
      toast.success(`${label}: ${result.published} published${skipped}.`)
      setPublishing(null)
      refreshRoster()
    },
    onError: (error) => {
      handleApiError(error)
      setPublishing(null)
      refreshRoster()
    },
  })

  function change(enrollment: Enrollment, field: GradeField, next: string | boolean) {
    setEdits((current) => withEdit(current, enrollment.id, enrollment.grade, field, next))
    setRowErrors((current) => {
      if (!current[enrollment.id]?.[field]) return current
      const { [field]: _removed, ...rest } = current[enrollment.id]
      return { ...current, [enrollment.id]: rest }
    })
  }

  if (!Number.isFinite(offeringId)) {
    return <EmptyState title="Section not found" />
  }

  if (offeringQuery.isError || rosterQuery.isError) {
    const status = [offeringQuery.error, rosterQuery.error].find((e) => e instanceof ApiError)?.status
    return (
      <>
        <BackLink isAdmin={isAdmin} />
        <Alert tone="error">
          <AlertTitle>{status === 403 || status === 404 ? 'Section not available' : 'Could not load the grading sheet'}</AlertTitle>
          <AlertDescription>
            {status === 403
              ? 'You can only open the grading sheet of a section you teach.'
              : status === 404
                ? 'This section does not exist.'
                : 'Check your connection and try again.'}
          </AlertDescription>
        </Alert>
      </>
    )
  }

  const loading = offeringQuery.isLoading || rosterQuery.isLoading
  const title = course ? `${course.course_code} · ${course.course_title}` : offering ? `Course #${offering.course_id}` : 'Grading sheet'
  const midtermPassed = !isAdmin && isPast(deadlines.midterm)
  const finalPassed = !isAdmin && isPast(deadlines.final)

  const midterm = publishReadiness(enrollments, 'midterm')
  const final = publishReadiness(enrollments, 'final')

  function publishBlock(period: GradePeriod): string | null {
    if (dirtyRows > 0) return 'Save your drafts first.'
    if (period === 'midterm' ? midtermPassed : finalPassed) return 'The grading deadline has passed.'
    if ((period === 'midterm' ? midterm : final).ready === 0) return 'No scores are ready to publish.'
    return null
  }

  const canSave = dirtyRows > 0 && !hasInvalidScore(edits) && !save.isPending
  const pending = publishing ? (publishing === 'midterm' ? midterm : final) : null

  return (
    <>
      <BackLink isAdmin={isAdmin} />
      <PageHeader
        title={title}
        description={
          offering
            ? `Section ${offering.section}${term ? ` · ${termLabel(term)}` : ''}. Scores are drafts until you publish them.`
            : undefined
        }
        actions={
          <Button onClick={() => save.mutate(toBulkRows(edits))} disabled={!canSave}>
            <Save /> {save.isPending ? 'Saving…' : `Save drafts${dirtyRows > 0 ? ` (${dirtyRows})` : ''}`}
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3">
        {isAdmin && (
          <Alert tone="neutral">
            <AlertTitle>Administrator override</AlertTitle>
            <AlertDescription>
              You can correct published grades. Grading deadlines and publish locks do not apply to you.
            </AlertDescription>
          </Alert>
        )}
        {(midtermPassed || finalPassed) && (
          <Alert tone="warning">
            <AlertTitle>Grading deadline passed</AlertTitle>
            <AlertDescription>
              {midtermPassed && finalPassed
                ? 'Midterm and final scores can no longer be saved or published.'
                : midtermPassed
                  ? 'Midterm scores can no longer be saved or published.'
                  : 'Final scores can no longer be saved or published.'}{' '}
              Ask an administrator if a correction is needed.
            </AlertDescription>
          </Alert>
        )}
        {term && (
          <dl className="grid gap-x-6 gap-y-1 rounded-lg border bg-card p-3 text-sm sm:grid-cols-3">
            <Deadline label="Midterm deadline" value={formatDateTime(term.midterm_grading_deadline)} passed={isPast(deadlines.midterm)} />
            <Deadline label="Final deadline" value={formatDateTime(term.final_grading_deadline)} passed={isPast(deadlines.final)} />
            <Deadline label="INC completion" value={formatDate(term.inc_completion_deadline)} passed={isIncPast(deadlines.inc)} />
          </dl>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search student name or number" />
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          {(['midterm', 'final'] as const).map((period) => {
            const block = publishBlock(period)
            const readiness = period === 'midterm' ? midterm : final
            return (
              <div key={period} className="flex flex-col items-end gap-0.5">
                <Button
                  variant="outline"
                  onClick={() => setPublishing(period)}
                  disabled={block !== null || publish.isPending}
                  aria-describedby={`${period}-hint`}
                >
                  <Send /> Publish {period}
                </Button>
                <span id={`${period}-hint`} className="type-caption text-xs">
                  {block ??
                    `${readiness.ready} ready${readiness.missing > 0 ? `, ${readiness.missing} missing scores` : ''}${readiness.published > 0 ? `, ${readiness.published} published` : ''}`}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {loading ? (
        <Card className="p-4">
          <Skeleton className="h-64 w-full" />
        </Card>
      ) : enrollments.length === 0 ? (
        <Card>
          <EmptyState title="No students enrolled" description="Students appear here once the registrar enrolls them." />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Student</TableHead>
                <TableHead>Midterm</TableHead>
                <TableHead>Final-term</TableHead>
                <TableHead>Final grade</TableHead>
                <TableHead>Re-exam</TableHead>
                <TableHead>INC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((enrollment) => (
                <GradeRow
                  key={enrollment.id}
                  enrollment={enrollment}
                  role={user.role}
                  deadlines={deadlines}
                  edits={edits[enrollment.id]}
                  errors={rowErrors[enrollment.id]}
                  onChange={(field, next) => change(enrollment, field, next)}
                />
              ))}
              {visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="type-caption py-8 text-center">
                    No student matches “{search}”.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      <ConfirmDialog
        open={publishing !== null}
        onOpenChange={(open) => !open && setPublishing(null)}
        title={`Publish ${publishing ?? ''} grades?`}
        description={
          publishing && pending
            ? `${pending.ready} student${pending.ready === 1 ? '' : 's'} will see their ${publishing} results${
                pending.missing > 0 ? `; ${pending.missing} without the needed score will be skipped` : ''
              }. ${
                isAdmin
                  ? ''
                  : `Once published, the ${publishing} scores are locked and only an administrator can change them.`
              }`
            : ''
        }
        confirmLabel={`Publish ${publishing ?? ''}`}
        loading={publish.isPending}
        onConfirm={() => publishing && publish.mutate(publishing)}
      />
      <ConfirmDialog {...leaveProps} />
    </>
  )
}

function BackLink({ isAdmin }: { isAdmin: boolean }) {
  return (
    <Button asChild variant="ghost" size="sm" className="mb-2 -ml-3 text-ink-secondary">
      <Link to={isAdmin ? '/course-offerings' : '/my/offerings'}>
        <ArrowLeft /> {isAdmin ? 'Course offerings' : 'My course offerings'}
      </Link>
    </Button>
  )
}

function Deadline({ label, value, passed }: { label: string; value: string; passed: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 sm:flex-col sm:items-start sm:justify-start">
      <dt className="type-caption">{label}</dt>
      <dd className={cn('tabular-nums', passed && 'font-semibold text-warning-fg')}>
        {value}
        {passed && ' · passed'}
      </dd>
    </div>
  )
}

interface GradeRowProps {
  enrollment: Enrollment
  role: ReturnType<typeof useCurrentUser>['role']
  deadlines: ReturnType<typeof deadlinesOf>
  edits: SheetEdits[number] | undefined
  errors: RowErrors[number] | undefined
  onChange: (field: GradeField, next: string | boolean) => void
}

function GradeRow({ enrollment, role, deadlines, edits, errors, onChange }: GradeRowProps) {
  const { grade, student } = enrollment
  const ctx = { role, grade, enrollment, deadlines }
  const name = student ? studentName(student) : `Enrollment #${enrollment.id}`
  const dropped = !isGradable(enrollment)

  return (
    <TableRow className={cn(dropped && 'opacity-70')}>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">{name}</span>
          <span className="flex items-center gap-2">
            {student && <MonoId>{student.student_number}</MonoId>}
            {dropped && <StatusBadge status={enrollment.status} />}
          </span>
        </div>
      </TableCell>

      <TableCell>
        <ScoreCell
          label={`${name} midterm score`}
          field="midterm_raw_score"
          ctx={ctx}
          edits={edits}
          error={errors?.midterm_raw_score}
          equivalent={grade?.midterm_equivalent_grade}
          published={isMidtermPublished(grade)}
          onChange={onChange}
        />
      </TableCell>

      <TableCell>
        <ScoreCell
          label={`${name} final-term score`}
          field="finalterm_raw_score"
          ctx={ctx}
          edits={edits}
          error={errors?.finalterm_raw_score}
          equivalent={grade?.finalterm_equivalent_grade}
          published={isFinalPublished(grade)}
          onChange={onChange}
        />
      </TableCell>

      <TableCell>
        <div className="flex flex-col tabular-nums">
          <span className="font-medium">{fmt(grade?.final_equivalent_grade, 1)}</span>
          <span className="type-caption text-xs">
            {dropped && !grade?.remarks ? 'Withdrawn' : (grade?.remarks ?? '—')}
            {grade?.final_raw_score !== null && grade?.final_raw_score !== undefined
              ? ` · ${fmt(grade.final_raw_score, 2)}`
              : ''}
          </span>
        </div>
      </TableCell>

      <TableCell>
        <ScoreCell
          label={`${name} re-exam score`}
          field="re_exam_raw_score"
          ctx={ctx}
          edits={edits}
          error={errors?.re_exam_raw_score}
          equivalent={grade?.re_exam_equivalent_grade}
          onChange={onChange}
          hideLockedReason
        />
      </TableCell>

      <TableCell>
        <IncCell label={`${name} marked incomplete`} ctx={ctx} edits={edits} error={errors?.is_inc} onChange={onChange} />
      </TableCell>
    </TableRow>
  )
}

interface ScoreCellProps {
  label: string
  field: ScoreField
  ctx: Parameters<typeof fieldState>[1]
  edits: SheetEdits[number] | undefined
  error: string | undefined
  equivalent: number | null | undefined
  published?: boolean
  hideLockedReason?: boolean
  onChange: (field: GradeField, next: string | boolean) => void
}

function ScoreCell({ label, field, ctx, edits, error, equivalent, published, hideLockedReason, onChange }: ScoreCellProps) {
  const state = fieldState(field, ctx)
  const value = scoreValue(field, ctx.grade, edits)
  const clientError = scoreError(value)
  const message = clientError ?? error
  const inputId = `${field}-${ctx.enrollment.id}`

  return (
    <div className="flex w-28 flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <Input
          id={inputId}
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          step="0.01"
          aria-label={label}
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? `${inputId}-error` : undefined}
          title={state.disabled ? state.reason : undefined}
          disabled={state.disabled}
          value={value}
          onChange={(event) => onChange(field, event.target.value)}
          className={cn('tabular-nums', edits?.[field] !== undefined && 'border-ring')}
        />
        {state.disabled && published && <Lock className="size-3.5 shrink-0 text-ink-muted" aria-label={state.reason} />}
      </div>
      <div className="flex items-center gap-1.5 text-xs">
        {equivalent !== null && equivalent !== undefined && <span className="tabular-nums text-ink-secondary">= {equivalent.toFixed(1)}</span>}
        {published !== undefined && ctx.grade && <StatusBadge status={published ? 'published' : 'draft'} />}
        {state.disabled && !published && !hideLockedReason && state.reason && ctx.enrollment.status === 'enrolled' && (
          <span className="type-caption text-xs">{state.reason}</span>
        )}
      </div>
      {message && (
        <p id={`${inputId}-error`} className="text-[0.8125rem] text-error-fg" role="alert">
          {message}
        </p>
      )}
    </div>
  )
}

interface IncCellProps {
  label: string
  ctx: Parameters<typeof fieldState>[1]
  edits: SheetEdits[number] | undefined
  error: string | undefined
  onChange: (field: GradeField, next: string | boolean) => void
}

function IncCell({ label, ctx, edits, error, onChange }: IncCellProps) {
  const state = fieldState('is_inc', ctx)
  const checked = incValue(ctx.grade, edits)
  const inputId = `is_inc-${ctx.enrollment.id}`

  return (
    <div className="flex flex-col gap-1">
      <input
        id={inputId}
        type="checkbox"
        className="size-4 accent-[var(--color-accent-brand)] disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={label}
        aria-invalid={error ? true : undefined}
        title={state.disabled ? state.reason : undefined}
        disabled={state.disabled}
        checked={checked}
        onChange={(event) => onChange('is_inc', event.target.checked)}
      />
      {error && (
        <p className="text-[0.8125rem] text-error-fg" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import { useMemo, useState, type ReactNode } from 'react'

import { FilterSelect } from '@/components/data-table/ListToolbar'
import { EmptyState } from '@/components/EmptyState'
import { MonoId } from '@/components/MonoId'
import { StatusBadge } from '@/components/StatusBadge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { studentsApi } from '@/lib/api/endpoints/resources'
import type { Enrollment, Grade, PublicationStatus } from '@/lib/api/types'
import { formatDate, termLabel } from '@/lib/format'
import { keys } from '@/lib/query/keys'

import { remarksTone } from '../student-portal/remarks'
import { offeringLabels, useMyOfferingsWithStatus } from '../student-portal/useMyOfferings'
import { score } from './gradeFormat'
import { pickDefaultTerm, termsFromOfferings } from './studentTerms'

/** One page holds a whole student's history; nested routes take page, per_page and (grades) academic_term_id. */
const ALL = { page: 1, per_page: 100 }

interface StudentGradesPanelProps {
  studentId: number
  /** Administrators also receive draft periods; show them (marked Draft) instead of "Not yet released". */
  showDrafts?: boolean
  /** Who is reading, for the wording of empty and error states. */
  audience?: 'student' | 'staff'
}

export function StudentGradesPanel({ studentId, showDrafts = false, audience = 'student' }: StudentGradesPanelProps) {
  // Grades carry `enrollment_id` only; the enrollments say which section each belongs to.
  const enrollmentsQuery = useQuery({
    queryKey: keys.list('enrollments', { student: studentId, ...ALL }),
    queryFn: () => studentsApi.enrollments(studentId, ALL),
  })

  const enrollments = enrollmentsQuery.data?.items
  const enrollmentById = useMemo(() => new Map((enrollments ?? []).map((e) => [e.id, e])), [enrollments])
  const { offerings, settled: offeringsSettled } = useMyOfferingsWithStatus(
    useMemo(() => (enrollments ?? []).map((e) => e.course_offering_id), [enrollments]),
  )

  // The student's own terms come from the offerings they are enrolled in (students cannot list terms).
  const terms = useMemo(() => termsFromOfferings(offerings.values()), [offerings])
  const defaultTerm = useMemo(() => pickDefaultTerm(terms), [terms])

  // null = untouched (use the current term), undefined = "All terms", string = a chosen term id.
  const [choice, setChoice] = useState<string | undefined | null>(null)
  const selectedValue = choice === null ? (defaultTerm ? String(defaultTerm.id) : undefined) : choice
  const selectedTermId = selectedValue === undefined ? undefined : Number(selectedValue)
  const selectedTerm = terms.find((t) => t.id === selectedTermId)

  // Wait for the terms so the first request already carries the right filter.
  const termsReady = enrollmentsQuery.isSuccess && offeringsSettled
  const params = { ...ALL, academic_term_id: selectedTermId }
  const gradesQuery = useQuery({
    queryKey: keys.list('student-grades', { student: studentId, ...params }),
    queryFn: () => studentsApi.grades(studentId, params),
    enabled: termsReady,
  })

  if (gradesQuery.isError || enrollmentsQuery.isError) {
    return (
      <Alert tone="error">
        <AlertTitle>Could not load {audience === 'student' ? 'your' : 'the'} grades</AlertTitle>
        <AlertDescription>
          Something went wrong while fetching the data.{' '}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => {
              gradesQuery.refetch()
              enrollmentsQuery.refetch()
            }}
          >
            Try again
          </button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!termsReady) {
    return <Skeleton className="h-64 w-full" />
  }

  const grades = gradesQuery.data?.items ?? []

  return (
    <div className="flex flex-col gap-4">
      {terms.length > 1 && (
        <FilterSelect
          value={selectedValue}
          onChange={setChoice}
          allLabel="All terms"
          className="sm:max-w-80"
          options={terms.map((t) => ({
            value: String(t.id),
            label: t.id === defaultTerm?.id ? `${termLabel(t)} (current)` : termLabel(t),
          }))}
        />
      )}
      {gradesQuery.isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : grades.length === 0 ? (
        <Card>
          <EmptyState
            title={selectedTerm ? `No grades released for ${termLabel(selectedTerm)}` : 'No grades released yet'}
            description={
              audience === 'student'
                ? 'Nothing has been published for you so far. Check back after your instructors publish results.'
                : 'Nothing has been published for this student so far.'
            }
            action={
              selectedTerm && terms.length > 1 ? (
                <Button variant="outline" size="sm" onClick={() => setChoice(undefined)}>
                  Show all terms
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        grades.map((grade) => {
          const enrollment = enrollmentById.get(grade.enrollment_id)
          return (
            <GradeCard
              key={grade.id}
              grade={grade}
              enrollment={enrollment}
              showDrafts={showDrafts}
              labels={offeringLabels(
                enrollment ? offerings.get(enrollment.course_offering_id) : undefined,
                enrollment?.course_offering_id ?? grade.enrollment_id,
              )}
            />
          )
        })
      )}
    </div>
  )
}

interface GradeCardProps {
  grade: Grade
  enrollment: Enrollment | undefined
  labels: ReturnType<typeof offeringLabels>
  showDrafts: boolean
}

function GradeCard({ grade, enrollment, labels, showDrafts }: GradeCardProps) {
  const finalOut = grade.final_status === 'published'
  const dropped = enrollment?.status === 'dropped'

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col">
          <MonoId>
            {labels.code}
            {labels.section && ` · ${labels.section}`}
          </MonoId>
          <h2 className="type-card">{labels.title ?? 'Course'}</h2>
          {labels.term && <p className="type-caption">{labels.term}</p>}
        </div>
        {finalOut && grade.remarks && <Badge tone={remarksTone(grade.remarks)}>{grade.remarks}</Badge>}
        {dropped && !grade.remarks && <Badge tone="neutral">Withdrawn</Badge>}
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Period
            title="Midterm"
            status={grade.midterm_status}
            showDrafts={showDrafts}
            publishedAt={grade.midterm_published_at}
          >
            <Row label="Score" value={score(grade.midterm_raw_score)} />
            <Row label="Grade" value={score(grade.midterm_equivalent_grade, 1)} />
          </Period>
          <Period title="Final" status={grade.final_status} showDrafts={showDrafts} publishedAt={grade.final_published_at}>
            <Row label="Final-term score" value={score(grade.finalterm_raw_score)} />
            <Row label="Final score" value={score(grade.final_raw_score)} />
            <Row label="Grade" value={score(grade.final_equivalent_grade, 1)} />
            {grade.re_exam_raw_score !== null && grade.re_exam_raw_score !== undefined && (
              <>
                <Row label="Re-exam score" value={score(grade.re_exam_raw_score)} />
                <Row label="Re-exam grade" value={score(grade.re_exam_equivalent_grade, 1)} />
              </>
            )}
            {grade.is_inc && grade.inc_expiration_date && (
              <Row label="Complete the work by" value={formatDate(grade.inc_expiration_date)} />
            )}
          </Period>
        </dl>
      </CardContent>
    </Card>
  )
}

function Period({
  title,
  status,
  showDrafts,
  publishedAt,
  children,
}: {
  title: string
  status: PublicationStatus | undefined
  showDrafts: boolean
  publishedAt: string | null | undefined
  children: ReactNode
}) {
  const released = status === 'published'
  const draft = status === 'draft' && showDrafts
  return (
    <section className="flex flex-col gap-1.5 rounded-md border bg-tint/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="type-label">{title}</h3>
        {draft && <StatusBadge status="draft" />}
      </div>
      {released || draft ? (
        <>
          {children}
          {released && publishedAt && <p className="type-caption text-xs">Released {formatDate(publishedAt)}</p>}
        </>
      ) : (
        <p className="type-caption">Not yet released</p>
      )}
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <dt className="text-ink-secondary">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  )
}

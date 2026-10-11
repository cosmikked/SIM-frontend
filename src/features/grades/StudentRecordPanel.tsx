import { useQuery } from '@tanstack/react-query'

import { EmptyState } from '@/components/EmptyState'
import { MonoId } from '@/components/MonoId'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { studentsApi } from '@/lib/api/endpoints/resources'
import type { AcademicRecordTerm } from '@/lib/api/types'
import { keys } from '@/lib/query/keys'

import { remarksTone } from '../student-portal/remarks'

type RecordRow = AcademicRecordTerm['enrollments'][number]

/** A subject counts toward the average only when it has a published numeric final grade. */
function isGraded(row: RecordRow): row is RecordRow & { final_equivalent_grade: number } {
  return row.final_equivalent_grade !== null && row.final_equivalent_grade !== undefined
}

interface Summary {
  units: number
  /** Units of subjects that passed (equivalent 3.0 or better). */
  earned: number
  /** Units-weighted average of published equivalents; null when nothing is graded yet. */
  average: number | null
}

function summarize(rows: RecordRow[]): Summary {
  const graded = rows.filter(isGraded)
  const gradedUnits = graded.reduce((sum, r) => sum + r.units, 0)
  const weighted = graded.reduce((sum, r) => sum + r.final_equivalent_grade * r.units, 0)
  return {
    units: rows.reduce((sum, r) => sum + r.units, 0),
    earned: graded.filter((r) => r.final_equivalent_grade <= 3).reduce((sum, r) => sum + r.units, 0),
    average: gradedUnits > 0 ? weighted / gradedUnits : null,
  }
}

interface StudentRecordPanelProps {
  studentId: number
  /** Who is reading, for the wording of empty and error states. */
  audience?: 'student' | 'staff'
}

export function StudentRecordPanel({ studentId, audience = 'student' }: StudentRecordPanelProps) {
  const query = useQuery({
    queryKey: keys.list('student-record', { student: studentId }),
    queryFn: () => studentsApi.academicRecord(studentId),
  })

  if (query.isLoading) {
    return <Skeleton className="h-64 w-full" />
  }

  if (query.isError || !query.data) {
    return (
      <Alert tone="error">
        <AlertTitle>Could not load {audience === 'student' ? 'your' : 'the'} academic record</AlertTitle>
        <AlertDescription>
          Something went wrong while fetching the data.{' '}
          <button type="button" className="font-semibold underline" onClick={() => query.refetch()}>
            Try again
          </button>
        </AlertDescription>
      </Alert>
    )
  }

  const terms = query.data
  if (terms.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No academic history yet"
          description={
            audience === 'student'
              ? 'Terms and subjects appear here once you are enrolled.'
              : 'Terms and subjects appear here once the student is enrolled.'
          }
        />
      </Card>
    )
  }

  const overall = summarize(terms.flatMap((t) => t.enrollments))

  return (
    <>
      <dl className="mb-4 grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-3">
        <Figure label="Units enrolled" value={String(overall.units)} />
        <Figure label="Units passed" value={String(overall.earned)} />
        <Figure
          label="Weighted average"
          value={overall.average === null ? '—' : overall.average.toFixed(2)}
          hint="Informational, not an official GPA. 1.0 is the best grade."
        />
      </dl>

      <div className="flex flex-col gap-4">
        {terms.map((term) => {
          const summary = summarize(term.enrollments)
          return (
            <Card key={term.academic_term}>
              <CardHeader className="flex flex-row flex-wrap items-baseline justify-between gap-2">
                <CardTitle>{term.academic_term}</CardTitle>
                <p className="type-caption tabular-nums">
                  {summary.units} units
                  {summary.average !== null && ` · average ${summary.average.toFixed(2)}`}
                </p>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Course</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                      <TableHead className="text-right">Final grade</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {term.enrollments.map((row, index) => (
                      <TableRow key={`${row.course_code}-${index}`}>
                        <TableCell>
                          <MonoId>{row.course_code}</MonoId>
                        </TableCell>
                        <TableCell className="font-medium">{row.course_title}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.units}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {isGraded(row) ? row.final_equivalent_grade.toFixed(1) : '—'}
                        </TableCell>
                        <TableCell>
                          {row.remarks ? <Badge tone={remarksTone(row.remarks)}>{row.remarks}</Badge> : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </>
  )
}

function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="type-caption">{label}</dt>
      <dd className="type-key-figure tabular-nums">{value}</dd>
      {hint && <p className="type-caption text-xs">{hint}</p>}
    </div>
  )
}

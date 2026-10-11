import { useQuery } from '@tanstack/react-query'
import { Info } from 'lucide-react'
import { useMemo } from 'react'

import { DataTable, type Column } from '@/components/data-table/DataTable'
import { useListParams } from '@/components/data-table/useListParams'
import { MonoId } from '@/components/MonoId'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { studentsApi } from '@/lib/api/endpoints/resources'
import type { Enrollment } from '@/lib/api/types'
import { useCurrentUser } from '@/lib/auth/useAuth'
import { formatDate, scheduleSummary, studentName } from '@/lib/format'
import { keys } from '@/lib/query/keys'

import { NoStudentRecord } from './NoStudentRecord'
import { offeringLabels, useMyOfferings } from './useMyOfferings'

export function MyEnrollmentsPage() {
  const studentId = useCurrentUser().student_id ?? null
  const { params, setPage, setPerPage } = useListParams()

  const student = useQuery({
    queryKey: keys.detail('students', studentId ?? 0),
    queryFn: () => studentsApi.get(studentId!),
    enabled: studentId !== null,
  })

  // Nested student routes accept only page and per_page.
  const listParams = { page: params.page, per_page: params.per_page }
  const query = useQuery({
    queryKey: keys.list('enrollments', { student: studentId, ...listParams }),
    queryFn: () => studentsApi.enrollments(studentId!, listParams),
    enabled: studentId !== null,
    placeholderData: (previous) => previous,
  })

  const items = query.data?.items
  const offeringIds = useMemo(() => (items ?? []).map((e) => e.course_offering_id), [items])
  const offerings = useMyOfferings(offeringIds)

  if (studentId === null) {
    return (
      <>
        <PageHeader title="My enrollments" description="Your current and past enrollments." />
        <NoStudentRecord />
      </>
    )
  }

  const columns: Column<Enrollment>[] = [
    {
      id: 'course',
      header: 'Course',
      cell: (e) => {
        const label = offeringLabels(offerings.get(e.course_offering_id), e.course_offering_id)
        return (
          <div className="flex flex-col">
            <MonoId>{label.code}</MonoId>
            <span className="font-medium">{label.title ?? '—'}</span>
          </div>
        )
      },
    },
    {
      id: 'section',
      header: 'Section',
      cell: (e) => <MonoId>{offerings.get(e.course_offering_id)?.section ?? '—'}</MonoId>,
    },
    {
      id: 'term',
      header: 'Term',
      className: 'whitespace-nowrap',
      cell: (e) => {
        const offering = offerings.get(e.course_offering_id)
        const label = offeringLabels(offering, e.course_offering_id)
        return (
          <span className="text-ink-secondary">
            {label.term ?? (offering ? `Term #${offering.academic_term_id}` : '—')}
          </span>
        )
      },
    },
    {
      id: 'schedule',
      header: 'Schedule',
      cell: (e) => {
        const schedules = offerings.get(e.course_offering_id)?.schedules ?? []
        if (schedules.length === 0) return <span className="text-ink-secondary">—</span>
        return (
          <ul className="flex flex-col gap-0.5 text-ink-secondary tabular-nums">
            {schedules.map((s) => (
              <li key={s.id} className="whitespace-nowrap">
                {scheduleSummary(s)}
              </li>
            ))}
          </ul>
        )
      },
    },
    {
      id: 'date',
      header: 'Enrolled on',
      className: 'whitespace-nowrap tabular-nums',
      cell: (e) => formatDate(e.enrollment_date),
    },
    { id: 'status', header: 'Status', cell: (e) => <StatusBadge status={e.status} /> },
  ]

  const s = student.data

  return (
    <>
      <PageHeader
        title="My enrollments"
        description={
          s
            ? `${studentName(s)} · Student no. ${s.student_number} · Year ${s.year_level}`
            : 'Your current and past enrollments.'
        }
      />

      <Alert tone="neutral" className="mb-4 flex-row items-start gap-2">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <AlertDescription>Enrolling in or dropping a class is done by the registrar&apos;s office.</AlertDescription>
      </Alert>

      <DataTable
        columns={columns}
        result={query.data}
        isLoading={query.isLoading}
        isError={query.isError}
        onRetry={() => query.refetch()}
        perPage={params.per_page ?? 15}
        onPageChange={setPage}
        onPerPageChange={setPerPage}
        getRowId={(e) => e.id}
        emptyTitle="No enrollments yet"
        emptyDescription="Your classes will appear here once the registrar enrolls you."
      />
    </>
  )
}

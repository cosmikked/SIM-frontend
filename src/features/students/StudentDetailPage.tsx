import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import { DataTable, type Column } from '@/components/data-table/DataTable'
import { EmptyState } from '@/components/EmptyState'
import { MonoId } from '@/components/MonoId'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { studentsApi } from '@/lib/api/endpoints/resources'
import type { Enrollment } from '@/lib/api/types'
import { formatDate, studentName, termLabel } from '@/lib/format'
import { useCurrentUser } from '@/lib/auth/useAuth'
import { keys } from '@/lib/query/keys'
import { useLookups } from '@/lib/query/useLookups'

import { EnrollmentFormDialog } from '../enrollments/EnrollmentFormDialog'
import { StudentGradesPanel } from '../grades/StudentGradesPanel'
import { StudentRecordPanel } from '../grades/StudentRecordPanel'
import { StudentFormDialog } from './StudentFormDialog'

const TABS = ['enrollments', 'grades', 'record'] as const
type Tab = (typeof TABS)[number]

export function StudentDetailPage() {
  const id = Number(useParams().id)
  const lookups = useLookups({ programs: true, courses: true, terms: true, offerings: true })
  const role = useCurrentUser().role
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = TABS.includes(searchParams.get('tab') as Tab) ? (searchParams.get('tab') as Tab) : 'enrollments'

  const [editOpen, setEditOpen] = useState(false)
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)

  // Same key as useStudentsById, so the name lookups and this page share one cached record.
  const student = useQuery({
    queryKey: keys.detail('students', id),
    queryFn: () => studentsApi.get(id),
    enabled: Number.isFinite(id),
  })

  // Keyed under 'enrollments' so enrolling or dropping anywhere refreshes this table.
  const params = { page, per_page: perPage }
  const enrollments = useQuery({
    queryKey: keys.list('enrollments', { student: id, ...params }),
    queryFn: () => studentsApi.enrollments(id, params),
    enabled: Number.isFinite(id),
    placeholderData: (previous) => previous,
  })

  if (student.isLoading) {
    return <Skeleton className="h-40 w-full" />
  }
  if (student.isError || !student.data) {
    return (
      <>
        <BackLink />
        <EmptyState title="Student not found" description="This student does not exist or was deleted." />
      </>
    )
  }

  const s = student.data
  const program = lookups.programs.get(s.program_id)

  const columns: Column<Enrollment>[] = [
    {
      id: 'section',
      header: 'Section',
      cell: (e) => {
        const offering = lookups.offerings.get(e.course_offering_id)
        const course = offering ? lookups.courses.get(offering.course_id) : undefined
        return (
          <div className="flex flex-col">
            <span className="font-medium">
              <MonoId>{course?.course_code ?? `#${e.course_offering_id}`}</MonoId> {offering?.section}
            </span>
            <span className="text-ink-secondary">{course?.course_title ?? '—'}</span>
          </div>
        )
      },
    },
    {
      id: 'term',
      header: 'Term',
      className: 'whitespace-nowrap',
      cell: (e) => {
        const offering = lookups.offerings.get(e.course_offering_id)
        const term = offering ? lookups.terms.get(offering.academic_term_id) : undefined
        return <span className="text-ink-secondary">{term ? termLabel(term) : '—'}</span>
      },
    },
    { id: 'date', header: 'Enrolled on', className: 'whitespace-nowrap tabular-nums', cell: (e) => formatDate(e.enrollment_date) },
    { id: 'status', header: 'Status', cell: (e) => <StatusBadge status={e.status} /> },
  ]

  const details: [string, string][] = [
    ['Email', s.email],
    ['Contact number', s.contact_number ?? '—'],
    ['Birth date', formatDate(s.birth_date)],
    ['Address', s.address ?? '—'],
    ['Program', program ? `${program.code} · ${program.name}` : `#${s.program_id}`],
    ['Year level', `Year ${s.year_level}`],
  ]

  return (
    <>
      <BackLink />
      <PageHeader
        title={studentName(s)}
        description={`Student no. ${s.student_number}`}
        actions={
          <>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil /> Edit
            </Button>
            <Button onClick={() => setEnrollOpen(true)}>
              <Plus /> Enroll in a section
            </Button>
          </>
        }
      />

      <Card className="mb-8">
        <CardContent>
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {details.map(([label, value]) => (
              <div key={label} className="flex flex-col gap-0.5">
                <dt className="type-caption">{label}</dt>
                <dd className="text-sm">{value}</dd>
              </div>
            ))}
            <div className="flex flex-col gap-0.5">
              <dt className="type-caption">Status</dt>
              <dd>
                <StatusBadge status={s.status} />
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Tabs
        value={tab}
        onValueChange={(next) =>
          setSearchParams(
            (prev) => {
              const params = new URLSearchParams(prev)
              if (next === 'enrollments') params.delete('tab')
              else params.set('tab', next)
              return params
            },
            { replace: true },
          )
        }
      >
        <TabsList>
          <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
          <TabsTrigger value="grades">Grades</TabsTrigger>
          <TabsTrigger value="record">Academic record</TabsTrigger>
        </TabsList>
        <TabsContent value="enrollments">
          <DataTable
            columns={columns}
            result={enrollments.data}
            isLoading={enrollments.isLoading}
            isError={enrollments.isError}
            onRetry={() => enrollments.refetch()}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={(next) => {
              setPerPage(next)
              setPage(1)
            }}
            getRowId={(e) => e.id}
            emptyTitle="Not enrolled in any section"
            emptyDescription="Use “Enroll in a section” to add one. Dropping is done from the Enrollments screen."
          />
        </TabsContent>
        <TabsContent value="grades">
          <StudentGradesPanel studentId={id} audience="staff" showDrafts={role === 'administrator'} />
        </TabsContent>
        <TabsContent value="record">
          <StudentRecordPanel studentId={id} audience="staff" />
        </TabsContent>
      </Tabs>

      <StudentFormDialog open={editOpen} onOpenChange={setEditOpen} student={s} />
      <EnrollmentFormDialog open={enrollOpen} onOpenChange={setEnrollOpen} student={s} />
    </>
  )
}

function BackLink() {
  return (
    <Button asChild variant="ghost" className="mb-2 -ml-3 text-ink-secondary">
      <Link to="/students">
        <ArrowLeft /> Students
      </Link>
    </Button>
  )
}

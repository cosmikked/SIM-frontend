import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, UserMinus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataTable, type Column } from '@/components/data-table/DataTable'
import { FilterSelect, ListToolbar, type ToolbarOption } from '@/components/data-table/ListToolbar'
import { SearchInput } from '@/components/data-table/SearchInput'
import { useListParams } from '@/components/data-table/useListParams'
import { MonoId } from '@/components/MonoId'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { enrollmentsApi } from '@/lib/api/endpoints/resources'
import { ENROLLMENT_STATUSES, type Enrollment } from '@/lib/api/types'
import { formatDate, studentName, termLabel } from '@/lib/format'
import { handleApiError } from '@/lib/forms/applyApiErrors'
import { keys } from '@/lib/query/keys'
import { useLookups } from '@/lib/query/useLookups'
import { useStudentsById } from '@/lib/query/useStudentsById'

import { EnrollmentFormDialog } from './EnrollmentFormDialog'

const FILTERS = ['status', 'course_offering_id'] as const

const STATUS_OPTIONS: ToolbarOption[] = ENROLLMENT_STATUSES.map((s) => ({
  value: s,
  label: s.charAt(0).toUpperCase() + s.slice(1),
}))

export function EnrollmentsPage() {
  const queryClient = useQueryClient()
  const { params, hasActive, clear, setPage, setPerPage, setSort, setSearch, setFilter } = useListParams(FILTERS, {
    defaultSort: '-created_at,-id',
  })
  const lookups = useLookups({ courses: true, terms: true, offerings: true })

  const [formOpen, setFormOpen] = useState(false)
  const [dropping, setDropping] = useState<Enrollment | null>(null)

  const query = useQuery({
    queryKey: keys.list('enrollments', params),
    queryFn: () => enrollmentsApi.list(params),
    placeholderData: (previous) => previous,
  })

  // Rows carry ids only; join the section and student names client-side.
  const items = query.data?.items
  const studentIds = useMemo(() => (items ?? []).map((e) => e.student_id), [items])
  const students = useStudentsById(studentIds)

  function offeringLabel(offeringId: number) {
    const offering = lookups.offerings.get(offeringId)
    const course = offering ? lookups.courses.get(offering.course_id) : undefined
    return {
      offering,
      course,
      code: course?.course_code ?? `#${offeringId}`,
      section: offering?.section,
      term: offering ? lookups.terms.get(offering.academic_term_id) : undefined,
    }
  }

  const offeringFilterOptions = [...lookups.offerings.values()].map((o) => {
    const course = lookups.courses.get(o.course_id)
    const term = lookups.terms.get(o.academic_term_id)
    return {
      value: String(o.id),
      label: `${course?.course_code ?? `#${o.course_id}`} ${o.section}${term ? ` · ${termLabel(term)}` : ''}`,
    }
  })

  const drop = useMutation({
    mutationFn: (enrollment: Enrollment) => enrollmentsApi.update(enrollment.id, { status: 'dropped' }),
    onSuccess: () => {
      toast.success('Enrollment dropped.')
      // Covers the lists, the student's enrollments and the seat counts (all keyed under 'enrollments').
      queryClient.invalidateQueries({ queryKey: keys.resource('enrollments') })
      setDropping(null)
    },
    onError: (error) => {
      handleApiError(error)
      setDropping(null)
    },
  })

  const columns: Column<Enrollment>[] = [
    {
      id: 'student',
      header: 'Student',
      cell: (e) => {
        const student = students.get(e.student_id)
        return (
          <div className="flex flex-col">
            <Link to={`/students/${e.student_id}`} className="font-medium hover:underline">
              {student ? studentName(student) : `Student #${e.student_id}`}
            </Link>
            {student && <MonoId>{student.student_number}</MonoId>}
          </div>
        )
      },
    },
    {
      id: 'section',
      header: 'Section',
      cell: (e) => {
        const { course, code, section } = offeringLabel(e.course_offering_id)
        return (
          <div className="flex flex-col">
            <span className="font-medium">
              <MonoId>{code}</MonoId> {section}
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
        const { term } = offeringLabel(e.course_offering_id)
        return <span className="text-ink-secondary">{term ? termLabel(term) : '—'}</span>
      },
    },
    {
      id: 'date',
      header: 'Enrolled on',
      sortKey: 'enrollment_date',
      className: 'whitespace-nowrap tabular-nums',
      cell: (e) => formatDate(e.enrollment_date),
    },
    { id: 'status', header: 'Status', sortKey: 'status', cell: (e) => <StatusBadge status={e.status} /> },
    {
      id: 'actions',
      header: '',
      className: 'w-28 text-right',
      cell: (e) => {
        if (e.status !== 'enrolled') return null
        const name = students.get(e.student_id)
        return (
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Drop ${name ? studentName(name) : `student #${e.student_id}`} from ${offeringLabel(e.course_offering_id).code}`}
            onClick={() => setDropping(e)}
          >
            <UserMinus /> Drop
          </Button>
        )
      },
    },
  ]

  const droppingStudent = dropping ? students.get(dropping.student_id) : undefined
  const droppingSection = dropping ? offeringLabel(dropping.course_offering_id) : undefined

  return (
    <>
      <PageHeader
        title="Enrollments"
        description="Enroll students in open sections, or drop them from a section."
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus /> Enroll student
          </Button>
        }
      />

      <ListToolbar onClear={clear} canClear={hasActive}>
        <SearchInput value={params.search ?? ''} onChange={setSearch} placeholder="Search by student number" />
        <FilterSelect
          value={params.course_offering_id}
          onChange={(v) => setFilter('course_offering_id', v)}
          allLabel="All sections"
          options={offeringFilterOptions}
        />
        <FilterSelect
          value={params.status}
          onChange={(v) => setFilter('status', v)}
          allLabel="All statuses"
          options={STATUS_OPTIONS}
        />
      </ListToolbar>

      <DataTable
        columns={columns}
        result={query.data}
        isLoading={query.isLoading}
        isError={query.isError}
        onRetry={() => query.refetch()}
        perPage={params.per_page ?? 15}
        sort={params.sort}
        onSort={setSort}
        onClearFilters={hasActive ? clear : undefined}
        onPageChange={setPage}
        onPerPageChange={setPerPage}
        getRowId={(e) => e.id}
        emptyTitle="No enrollments found"
        emptyDescription="Enroll a student in an open section, or adjust the search and filters."
      />

      <EnrollmentFormDialog open={formOpen} onOpenChange={setFormOpen} />

      <ConfirmDialog
        open={dropping !== null}
        onOpenChange={(open) => !open && setDropping(null)}
        title="Drop this enrollment?"
        description={`${droppingStudent ? studentName(droppingStudent) : 'The student'} will be dropped from ${droppingSection?.code ?? 'this section'} ${droppingSection?.section ?? ''}. Their scores are cleared and the grade becomes Withdrawn (or Failed if the midterm deadline has passed and they were failing). That result is published immediately.`}
        confirmLabel="Drop student"
        destructive
        loading={drop.isPending}
        onConfirm={() => dropping && drop.mutate(dropping)}
      />
    </>
  )
}

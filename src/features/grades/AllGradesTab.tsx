import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Link } from 'react-router'

import { DataTable, type Column } from '@/components/data-table/DataTable'
import { FilterSelect, ListToolbar } from '@/components/data-table/ListToolbar'
import { SearchInput } from '@/components/data-table/SearchInput'
import { useListParams } from '@/components/data-table/useListParams'
import { MonoId } from '@/components/MonoId'
import { Badge } from '@/components/ui/badge'
import { gradesApi } from '@/lib/api/endpoints/resources'
import type { Grade } from '@/lib/api/types'
import { studentName, termLabel } from '@/lib/format'
import { keys } from '@/lib/query/keys'
import { useEnrollmentsById } from '@/lib/query/useEnrollmentsById'
import { useLookups } from '@/lib/query/useLookups'
import { useStudentsById } from '@/lib/query/useStudentsById'

import { remarksTone } from '../student-portal/remarks'
import { PeriodCell } from './gradeCells'

const FILTERS = ['is_inc'] as const

const INC_OPTIONS = [
  { value: 'true', label: 'INC only' },
  { value: 'false', label: 'Not INC' },
]

/** Every grade the signed-in role may see (registrars: published periods only). Read-only. */
export function AllGradesTab() {
  const { params, hasActive, clear, setPage, setPerPage, setSort, setSearch, setFilter } = useListParams(FILTERS, {
    defaultSort: '-created_at,-id',
  })
  const lookups = useLookups({ courses: true, terms: true, offerings: true })

  const query = useQuery({
    queryKey: keys.list('grades', params),
    queryFn: () => gradesApi.list(params),
    placeholderData: (previous) => previous,
  })

  // Grade rows carry `enrollment_id` only: join enrollment -> student and section client-side.
  const items = query.data?.items
  const enrollments = useEnrollmentsById(useMemo(() => (items ?? []).map((g) => g.enrollment_id), [items]))
  const students = useStudentsById(useMemo(() => [...enrollments.values()].map((e) => e.student_id), [enrollments]))

  const columns: Column<Grade>[] = [
    {
      id: 'student',
      header: 'Student',
      cell: (g) => {
        const enrollment = enrollments.get(g.enrollment_id)
        const student = enrollment ? students.get(enrollment.student_id) : undefined
        if (!enrollment) return <span className="text-ink-muted">Enrollment #{g.enrollment_id}</span>
        return (
          <div className="flex flex-col">
            <Link to={`/students/${enrollment.student_id}`} className="font-medium hover:underline">
              {student ? studentName(student) : `Student #${enrollment.student_id}`}
            </Link>
            {student && <MonoId>{student.student_number}</MonoId>}
          </div>
        )
      },
    },
    {
      id: 'section',
      header: 'Section',
      cell: (g) => {
        const enrollment = enrollments.get(g.enrollment_id)
        const offering = enrollment ? lookups.offerings.get(enrollment.course_offering_id) : undefined
        const course = offering ? lookups.courses.get(offering.course_id) : undefined
        const term = offering ? lookups.terms.get(offering.academic_term_id) : undefined
        if (!enrollment) return '—'
        return (
          <div className="flex flex-col">
            <span className="font-medium">
              <MonoId>{course?.course_code ?? `#${enrollment.course_offering_id}`}</MonoId> {offering?.section}
            </span>
            <span className="text-ink-secondary">{term ? termLabel(term) : (course?.course_title ?? '—')}</span>
          </div>
        )
      },
    },
    {
      id: 'midterm',
      header: 'Midterm',
      sortKey: 'midterm_raw_score',
      className: 'whitespace-nowrap',
      cell: (g) => <PeriodCell grade={g} period="midterm" />,
    },
    {
      id: 'final',
      header: 'Final',
      sortKey: 'final_raw_score',
      className: 'whitespace-nowrap',
      cell: (g) => <PeriodCell grade={g} period="final" />,
    },
    {
      id: 'remarks',
      header: 'Remarks',
      cell: (g) => (g.remarks ? <Badge tone={remarksTone(g.remarks)}>{g.remarks}</Badge> : '—'),
    },
  ]

  return (
    <>
      <ListToolbar onClear={clear} canClear={hasActive}>
        <SearchInput value={params.search ?? ''} onChange={setSearch} placeholder="Search by student number" />
        <FilterSelect
          value={params.is_inc}
          onChange={(v) => setFilter('is_inc', v)}
          allLabel="All grades"
          options={INC_OPTIONS}
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
        getRowId={(g) => g.id}
        emptyTitle="No grades found"
        emptyDescription="Grades appear here once an instructor publishes a period."
      />
    </>
  )
}

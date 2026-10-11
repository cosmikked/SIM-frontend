import { useQuery } from '@tanstack/react-query'
import { ClipboardCheck } from 'lucide-react'
import { Link } from 'react-router'

import { DataTable, type Column } from '@/components/data-table/DataTable'
import { FilterSelect, ListToolbar, type ToolbarOption } from '@/components/data-table/ListToolbar'
import { SearchInput } from '@/components/data-table/SearchInput'
import { useListParams } from '@/components/data-table/useListParams'
import { MonoId } from '@/components/MonoId'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { courseOfferingsApi } from '@/lib/api/endpoints/resources'
import { OFFERING_STATUSES, type CourseOffering } from '@/lib/api/types'
import { scheduleSummary, termLabel } from '@/lib/format'
import { keys } from '@/lib/query/keys'

const FILTERS = ['status'] as const

const STATUS_OPTIONS: ToolbarOption[] = OFFERING_STATUSES.map((s) => ({
  value: s,
  label: s.charAt(0).toUpperCase() + s.slice(1),
}))

/**
 * The instructor's own sections (the API filters the list by the signed-in instructor).
 * Instructors get 403 on /courses, /academic-terms and /rooms, so names come from the
 * `course` / `academic_term` objects embedded in each offering, with an id as the fallback.
 */
export function MyOfferingsPage() {
  const { params, hasActive, clear, setPage, setPerPage, setSort, setSearch, setFilter } = useListParams(FILTERS, {
    defaultSort: '-created_at,-id',
  })

  const query = useQuery({
    queryKey: keys.list('course-offerings', params),
    queryFn: () => courseOfferingsApi.list(params),
    placeholderData: (previous) => previous,
  })

  const columns: Column<CourseOffering>[] = [
    {
      id: 'course',
      header: 'Course',
      cell: (o) => (
        <div className="flex flex-col">
          <MonoId>{o.course?.course_code ?? `Course #${o.course_id}`}</MonoId>
          <span className="font-medium">{o.course?.course_title ?? '—'}</span>
        </div>
      ),
    },
    { id: 'section', header: 'Section', sortKey: 'section', cell: (o) => <MonoId>{o.section}</MonoId> },
    {
      id: 'term',
      header: 'Term',
      className: 'whitespace-nowrap',
      cell: (o) => (
        <span className="text-ink-secondary">
          {o.academic_term ? termLabel(o.academic_term) : `Term #${o.academic_term_id}`}
        </span>
      ),
    },
    {
      id: 'schedule',
      header: 'Schedule',
      cell: (o) => (
        <ul className="flex flex-col gap-0.5 text-ink-secondary tabular-nums">
          {o.schedules.map((s) => (
            <li key={s.id} className="whitespace-nowrap">
              {scheduleSummary(s)}
            </li>
          ))}
        </ul>
      ),
    },
    { id: 'capacity', header: 'Seats', sortKey: 'capacity', className: 'tabular-nums', cell: (o) => o.capacity },
    { id: 'status', header: 'Status', cell: (o) => <StatusBadge status={o.status} /> },
    {
      id: 'actions',
      header: '',
      className: 'w-44 text-right',
      cell: (o) => (
        <Button asChild variant="outline" size="sm">
          <Link
            to={`/my/offerings/${o.id}/grading`}
            aria-label={`Open grading sheet for ${o.course?.course_code ?? `course #${o.course_id}`} ${o.section}`}
          >
            <ClipboardCheck /> Grading sheet
          </Link>
        </Button>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="My course offerings"
        description="The sections you teach. Open a grading sheet to enter scores, then publish midterm and final grades."
      />

      <ListToolbar onClear={clear} canClear={hasActive}>
        <SearchInput value={params.search ?? ''} onChange={setSearch} placeholder="Search course" />
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
        getRowId={(o) => o.id}
        emptyTitle="No sections assigned"
        emptyDescription="Sections you are assigned to teach will appear here."
      />
    </>
  )
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ClipboardCheck, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
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
import { canAccess } from '@/lib/auth/permissions'
import { useCurrentUser } from '@/lib/auth/useAuth'
import { courseOfferingsApi } from '@/lib/api/endpoints/resources'
import { OFFERING_STATUSES, type CourseOffering } from '@/lib/api/types'
import { scheduleSummary, termLabel } from '@/lib/format'
import { handleApiError } from '@/lib/forms/applyApiErrors'
import { keys } from '@/lib/query/keys'
import { useLookups } from '@/lib/query/useLookups'

const FILTERS = ['status', 'academic_term_id', 'course_id', 'instructor_id'] as const

const STATUS_OPTIONS: ToolbarOption[] = OFFERING_STATUSES.map((s) => ({
  value: s,
  label: s.charAt(0).toUpperCase() + s.slice(1),
}))

export function CourseOfferingsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const canGrade = canAccess(useCurrentUser().role, 'grading')
  const { params, hasActive, clear, setPage, setPerPage, setSort, setSearch, setFilter } = useListParams(FILTERS, {
    defaultSort: '-created_at,-id',
  })
  const lookups = useLookups({ terms: true, courses: true, rooms: true, instructors: true })

  const termOptions = [...lookups.terms.values()].map((t) => ({ value: String(t.id), label: termLabel(t) }))
  const courseOptions = [...lookups.courses.values()].map((c) => ({
    value: String(c.id),
    label: `${c.course_code} · ${c.course_title}`,
  }))
  const instructorOptions = [...lookups.instructors.values()].map((i) => ({ value: String(i.id), label: i.name }))

  const [deleting, setDeleting] = useState<CourseOffering | null>(null)

  const query = useQuery({
    queryKey: keys.list('course-offerings', params),
    queryFn: () => courseOfferingsApi.list(params),
    placeholderData: (previous) => previous,
  })

  const remove = useMutation({
    mutationFn: (offering: CourseOffering) => courseOfferingsApi.remove(offering.id),
    onSuccess: () => {
      toast.success('Section deleted.')
      queryClient.invalidateQueries({ queryKey: keys.resource('course-offerings') })
      queryClient.invalidateQueries({ queryKey: keys.lookups.offerings })
      setDeleting(null)
    },
    // 409: the section has (or had) enrollments.
    onError: (error) => {
      handleApiError(error)
      setDeleting(null)
    },
  })

  const columns: Column<CourseOffering>[] = [
    {
      id: 'course',
      header: 'Course',
      cell: (o) => {
        const course = lookups.courses.get(o.course_id)
        return (
          <div className="flex flex-col">
            <MonoId>{course?.course_code ?? `#${o.course_id}`}</MonoId>
            <span className="font-medium">{course?.course_title ?? '—'}</span>
          </div>
        )
      },
    },
    { id: 'section', header: 'Section', sortKey: 'section', cell: (o) => <MonoId>{o.section}</MonoId> },
    {
      id: 'term',
      header: 'Term',
      className: 'whitespace-nowrap',
      cell: (o) => {
        const term = lookups.terms.get(o.academic_term_id)
        return <span className="text-ink-secondary">{term ? termLabel(term) : '—'}</span>
      },
    },
    {
      id: 'instructor',
      header: 'Instructor',
      cell: (o) => (o.instructor_id ? (lookups.instructors.get(o.instructor_id)?.name ?? '—') : 'Unassigned'),
    },
    {
      id: 'schedule',
      header: 'Schedule',
      cell: (o) => (
        <ul className="flex flex-col gap-0.5 text-ink-secondary tabular-nums">
          {o.schedules.map((s) => (
            <li key={s.id} className="whitespace-nowrap">
              {scheduleSummary(s, lookups.rooms.get(s.room_id))}
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
      className: 'w-32 text-right',
      cell: (o) => {
        const label = `${lookups.courses.get(o.course_id)?.course_code ?? 'section'} ${o.section}`
        return (
          <div className="flex justify-end gap-1">
            {canGrade && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Open grading sheet for ${label}`}
                onClick={() => navigate(`/course-offerings/${o.id}/grading`)}
              >
                <ClipboardCheck />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Edit ${label}`}
              onClick={() => navigate(`/course-offerings/${o.id}/edit`)}
            >
              <Pencil />
            </Button>
            <Button variant="ghost" size="icon" aria-label={`Delete ${label}`} onClick={() => setDeleting(o)}>
              <Trash2 />
            </Button>
          </div>
        )
      },
    },
  ]

  const deletingCourse = deleting ? lookups.courses.get(deleting.course_id) : undefined

  return (
    <>
      <PageHeader
        title="Course offerings"
        description="Sections of a course in a term, with their instructor, rooms and meeting times."
        actions={
          <Button asChild>
            <Link to="/course-offerings/new">
              <Plus /> New section
            </Link>
          </Button>
        }
      />

      <ListToolbar onClear={clear} canClear={hasActive}>
        <SearchInput value={params.search ?? ''} onChange={setSearch} placeholder="Search course or instructor" />
        <FilterSelect
          value={params.academic_term_id}
          onChange={(v) => setFilter('academic_term_id', v)}
          allLabel="All terms"
          options={termOptions}
        />
        <FilterSelect
          value={params.course_id}
          onChange={(v) => setFilter('course_id', v)}
          allLabel="All courses"
          options={courseOptions}
        />
        <FilterSelect
          value={params.instructor_id}
          onChange={(v) => setFilter('instructor_id', v)}
          allLabel="All instructors"
          options={instructorOptions}
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
        getRowId={(o) => o.id}
        emptyTitle="No sections found"
        emptyDescription="Create a section in an active term, or adjust the search and filters."
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete section?"
        description={`${deletingCourse?.course_code ?? 'This section'} ${deleting?.section ?? ''} and its schedule will be permanently deleted. This is blocked if anyone has ever enrolled in it.`}
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </>
  )
}

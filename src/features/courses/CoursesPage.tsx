import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
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
import { coursesApi } from '@/lib/api/endpoints/resources'
import type { Course } from '@/lib/api/types'
import { handleApiError } from '@/lib/forms/applyApiErrors'
import { keys } from '@/lib/query/keys'

import { CourseFormDialog } from './CourseFormDialog'

const FILTERS = ['status'] as const

const STATUS_OPTIONS: ToolbarOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

export function CoursesPage() {
  const queryClient = useQueryClient()
  const { params, hasActive, clear, setPage, setPerPage, setSort, setSearch, setFilter } = useListParams(FILTERS, {
    defaultSort: '-created_at,-id',
  })

  const [editing, setEditing] = useState<Course | undefined>()
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Course | null>(null)

  const query = useQuery({
    queryKey: keys.list('courses', params),
    queryFn: () => coursesApi.list(params),
    placeholderData: (previous) => previous,
  })

  const remove = useMutation({
    mutationFn: (course: Course) => coursesApi.remove(course.id),
    onSuccess: () => {
      toast.success('Course deleted.')
      queryClient.invalidateQueries({ queryKey: keys.resource('courses') })
      queryClient.invalidateQueries({ queryKey: keys.lookups.courses })
      setDeleting(null)
    },
    // 409: the course is used by a course offering; the server message says so.
    onError: (error) => {
      handleApiError(error)
      setDeleting(null)
    },
  })

  const columns: Column<Course>[] = [
    { id: 'code', header: 'Code', sortKey: 'course_code', cell: (c) => <MonoId>{c.course_code}</MonoId> },
    {
      id: 'title',
      header: 'Title',
      sortKey: 'course_title',
      cell: (c) => <span className="font-medium">{c.course_title}</span>,
    },
    { id: 'units', header: 'Units', sortKey: 'units', className: 'tabular-nums', cell: (c) => c.units },
    { id: 'status', header: 'Status', cell: (c) => <StatusBadge status={c.status} /> },
    {
      id: 'actions',
      header: '',
      className: 'w-24 text-right',
      cell: (c) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Edit ${c.course_code}`}
            onClick={() => {
              setEditing(c)
              setFormOpen(true)
            }}
          >
            <Pencil />
          </Button>
          <Button variant="ghost" size="icon" aria-label={`Delete ${c.course_code}`} onClick={() => setDeleting(c)}>
            <Trash2 />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Courses"
        description="The course catalog. Sections are created from these."
        actions={
          <Button
            onClick={() => {
              setEditing(undefined)
              setFormOpen(true)
            }}
          >
            <Plus /> New course
          </Button>
        }
      />

      <ListToolbar onClear={clear} canClear={hasActive}>
        <SearchInput value={params.search ?? ''} onChange={setSearch} placeholder="Search by code or title" />
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
        getRowId={(c) => c.id}
        emptyTitle="No courses found"
        emptyDescription="Add a course to the catalog, or adjust the search and filters."
      />

      <CourseFormDialog open={formOpen} onOpenChange={setFormOpen} course={editing} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete course?"
        description={`"${deleting?.course_code ?? ''} ${deleting?.course_title ?? ''}" will be permanently deleted. This is blocked if any course offering uses it.`}
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </>
  )
}

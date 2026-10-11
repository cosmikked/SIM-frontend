import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
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
import { studentsApi } from '@/lib/api/endpoints/resources'
import { STUDENT_STATUSES, YEAR_LEVELS, type Student } from '@/lib/api/types'
import { studentName } from '@/lib/format'
import { handleApiError } from '@/lib/forms/applyApiErrors'
import { keys } from '@/lib/query/keys'
import { useLookups } from '@/lib/query/useLookups'

import { StudentFormDialog } from './StudentFormDialog'

const FILTERS = ['status', 'program_id', 'year_level'] as const

const STATUS_OPTIONS: ToolbarOption[] = STUDENT_STATUSES.map((s) => ({
  value: s,
  label: s.charAt(0).toUpperCase() + s.slice(1),
}))

const YEAR_OPTIONS: ToolbarOption[] = YEAR_LEVELS.map((y) => ({ value: String(y), label: `Year ${y}` }))

export function StudentsPage() {
  const queryClient = useQueryClient()
  const { params, hasActive, clear, setPage, setPerPage, setSort, setSearch, setFilter } = useListParams(FILTERS, {
    defaultSort: '-created_at,-id',
  })
  const lookups = useLookups({ programs: true })
  const programOptions = [...lookups.programs.values()].map((p) => ({ value: String(p.id), label: p.code }))

  const [editing, setEditing] = useState<Student | undefined>()
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Student | null>(null)

  const query = useQuery({
    queryKey: keys.list('students', params),
    queryFn: () => studentsApi.list(params),
    placeholderData: (previous) => previous,
  })

  const remove = useMutation({
    mutationFn: (student: Student) => studentsApi.remove(student.id),
    onSuccess: () => {
      toast.success('Student deleted.')
      queryClient.invalidateQueries({ queryKey: keys.resource('students') })
      setDeleting(null)
    },
    // 409: the student has enrollments; the server message says so.
    onError: (error) => {
      handleApiError(error)
      setDeleting(null)
    },
  })

  const columns: Column<Student>[] = [
    { id: 'number', header: 'Student no.', sortKey: 'student_number', cell: (s) => <MonoId>{s.student_number}</MonoId> },
    {
      id: 'name',
      header: 'Name',
      sortKey: 'last_name',
      cell: (s) => (
        <div className="flex flex-col">
          <Link to={`/students/${s.id}`} className="font-medium hover:underline">
            {studentName(s)}
          </Link>
          <span className="text-ink-secondary">{s.email}</span>
        </div>
      ),
    },
    {
      id: 'program',
      header: 'Program',
      cell: (s) => <MonoId>{lookups.programs.get(s.program_id)?.code ?? `#${s.program_id}`}</MonoId>,
    },
    { id: 'year', header: 'Year', sortKey: 'year_level', className: 'tabular-nums', cell: (s) => s.year_level },
    { id: 'status', header: 'Status', cell: (s) => <StatusBadge status={s.status} /> },
    {
      id: 'actions',
      header: '',
      className: 'w-24 text-right',
      cell: (s) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Edit ${studentName(s)}`}
            onClick={() => {
              setEditing(s)
              setFormOpen(true)
            }}
          >
            <Pencil />
          </Button>
          <Button variant="ghost" size="icon" aria-label={`Delete ${studentName(s)}`} onClick={() => setDeleting(s)}>
            <Trash2 />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Students"
        description="Student records. Creating a student also creates their login."
        actions={
          <Button
            onClick={() => {
              setEditing(undefined)
              setFormOpen(true)
            }}
          >
            <Plus /> New student
          </Button>
        }
      />

      <ListToolbar onClear={clear} canClear={hasActive}>
        <SearchInput value={params.search ?? ''} onChange={setSearch} placeholder="Search name or student number" />
        <FilterSelect
          value={params.program_id}
          onChange={(v) => setFilter('program_id', v)}
          allLabel="All programs"
          options={programOptions}
        />
        <FilterSelect
          value={params.year_level}
          onChange={(v) => setFilter('year_level', v)}
          allLabel="All years"
          options={YEAR_OPTIONS}
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
        getRowId={(s) => s.id}
        emptyTitle="No students found"
        emptyDescription="Add a student, or adjust the search and filters."
      />

      <StudentFormDialog open={formOpen} onOpenChange={setFormOpen} student={editing} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete student?"
        description={`${deleting ? studentName(deleting) : 'This student'} will be permanently deleted. This is blocked if the student has any enrollment.`}
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </>
  )
}

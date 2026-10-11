import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarClock, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataTable, type Column } from '@/components/data-table/DataTable'
import { FilterSelect, ListToolbar, type ToolbarOption } from '@/components/data-table/ListToolbar'
import { SearchInput } from '@/components/data-table/SearchInput'
import { useListParams } from '@/components/data-table/useListParams'
import { PageHeader } from '@/components/PageHeader'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { academicTermsApi } from '@/lib/api/endpoints/resources'
import { TERM_NAMES, type AcademicTerm } from '@/lib/api/types'
import { formatDate } from '@/lib/format'
import { handleApiError } from '@/lib/forms/applyApiErrors'
import { keys } from '@/lib/query/keys'

import { GradingDeadlinesDialog } from './GradingDeadlinesDialog'
import { TermFormDialog } from './TermFormDialog'
import { TermReadiness } from './TermReadiness'

const FILTERS = ['status', 'term'] as const

const STATUS_OPTIONS: ToolbarOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

const TERM_OPTIONS: ToolbarOption[] = TERM_NAMES.map((name) => ({ value: name, label: name }))

export function AcademicTermsPage() {
  const queryClient = useQueryClient()
  const { params, hasActive, clear, setPage, setPerPage, setSort, setSearch, setFilter } = useListParams(FILTERS, {
    defaultSort: '-created_at,-id',
  })

  const [editing, setEditing] = useState<AcademicTerm | undefined>()
  const [formOpen, setFormOpen] = useState(false)
  const [deadlinesFor, setDeadlinesFor] = useState<AcademicTerm | null>(null)
  const [deleting, setDeleting] = useState<AcademicTerm | null>(null)

  const query = useQuery({
    queryKey: keys.list('academic-terms', params),
    queryFn: () => academicTermsApi.list(params),
    placeholderData: (previous) => previous,
  })

  const remove = useMutation({
    mutationFn: (term: AcademicTerm) => academicTermsApi.remove(term.id),
    onSuccess: () => {
      toast.success('Term deleted.')
      queryClient.invalidateQueries({ queryKey: keys.resource('academic-terms') })
      queryClient.invalidateQueries({ queryKey: keys.lookups.terms })
      setDeleting(null)
    },
    // 409: the term still has course offerings.
    onError: (error) => {
      handleApiError(error)
      setDeleting(null)
    },
  })

  const columns: Column<AcademicTerm>[] = [
    {
      id: 'academic_year',
      header: 'Academic year',
      sortKey: 'academic_year',
      cell: (t) => (
        <div className="flex flex-col">
          <span className="font-medium tabular-nums">{t.academic_year}</span>
          <span className="type-caption">{t.term}</span>
        </div>
      ),
    },
    {
      id: 'dates',
      header: 'Dates',
      sortKey: 'start_date',
      className: 'whitespace-nowrap',
      cell: (t) => (
        <span className="text-ink-secondary tabular-nums">
          {formatDate(t.start_date)} – {formatDate(t.end_date)}
        </span>
      ),
    },
    { id: 'setup', header: 'Setup', cell: (t) => <TermReadiness term={t} /> },
    { id: 'status', header: 'Status', cell: (t) => <StatusBadge status={t.status} /> },
    {
      id: 'actions',
      header: '',
      className: 'w-36 text-right',
      cell: (t) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Grading deadlines for ${t.academic_year} ${t.term}`}
            title="Grading deadlines"
            onClick={() => setDeadlinesFor(t)}
          >
            <CalendarClock />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Edit ${t.academic_year} ${t.term}`}
            onClick={() => {
              setEditing(t)
              setFormOpen(true)
            }}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Delete ${t.academic_year} ${t.term}`}
            onClick={() => setDeleting(t)}
          >
            <Trash2 />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Academic terms"
        description="Create a term, set its grading deadlines, then add sections to it."
        actions={
          <Button
            onClick={() => {
              setEditing(undefined)
              setFormOpen(true)
            }}
          >
            <Plus /> New term
          </Button>
        }
      />

      <ListToolbar onClear={clear} canClear={hasActive}>
        <SearchInput value={params.search ?? ''} onChange={setSearch} placeholder="Search by academic year" />
        <FilterSelect value={params.term} onChange={(v) => setFilter('term', v)} allLabel="All terms" options={TERM_OPTIONS} />
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
        getRowId={(t) => t.id}
        emptyTitle="No academic terms yet"
        emptyDescription="Create the first term to start setting up the academic year."
      />

      <TermFormDialog open={formOpen} onOpenChange={setFormOpen} term={editing} />

      <GradingDeadlinesDialog
        open={deadlinesFor !== null}
        onOpenChange={(open) => !open && setDeadlinesFor(null)}
        term={deadlinesFor}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete term?"
        description={`${deleting?.academic_year ?? ''} ${deleting?.term ?? ''} will be permanently deleted. This is blocked if the term has course offerings.`}
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </>
  )
}

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
import { programsApi } from '@/lib/api/endpoints/resources'
import type { Program } from '@/lib/api/types'
import { handleApiError } from '@/lib/forms/applyApiErrors'
import { keys } from '@/lib/query/keys'

import { ProgramFormDialog } from './ProgramFormDialog'

const FILTERS = ['status'] as const

const STATUS_OPTIONS: ToolbarOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

/**
 * Reference implementation for list screens: URL-bound list state (useListParams),
 * a TanStack Query list, DataTable, a create/edit form dialog and a confirmed delete.
 * Copy this shape for courses, terms, students, ...
 */
export function ProgramsPage() {
  const queryClient = useQueryClient()
  const { params, hasActive, clear, setPage, setPerPage, setSort, setSearch, setFilter } = useListParams(FILTERS, {
    defaultSort: '-created_at,-id',
  })

  const [editing, setEditing] = useState<Program | undefined>()
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Program | null>(null)

  const query = useQuery({
    queryKey: keys.list('programs', params),
    queryFn: () => programsApi.list(params),
    placeholderData: (previous) => previous,
  })

  const remove = useMutation({
    mutationFn: (program: Program) => programsApi.remove(program.id),
    onSuccess: () => {
      toast.success('Program deleted.')
      queryClient.invalidateQueries({ queryKey: keys.resource('programs') })
      queryClient.invalidateQueries({ queryKey: keys.lookups.programs })
      setDeleting(null)
    },
    // 409 (program still has students) arrives with a server message that explains why.
    onError: (error) => {
      handleApiError(error)
      setDeleting(null)
    },
  })

  const columns: Column<Program>[] = [
    { id: 'code', header: 'Code', sortKey: 'code', cell: (p) => <MonoId>{p.code}</MonoId> },
    { id: 'name', header: 'Name', sortKey: 'name', cell: (p) => <span className="font-medium">{p.name}</span> },
    {
      id: 'description',
      header: 'Description',
      cell: (p) => <span className="line-clamp-1 text-ink-secondary">{p.description || '—'}</span>,
    },
    { id: 'status', header: 'Status', cell: (p) => <StatusBadge status={p.status} /> },
    {
      id: 'actions',
      header: '',
      className: 'w-24 text-right',
      cell: (p) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Edit ${p.code}`}
            onClick={() => {
              setEditing(p)
              setFormOpen(true)
            }}
          >
            <Pencil />
          </Button>
          <Button variant="ghost" size="icon" aria-label={`Delete ${p.code}`} onClick={() => setDeleting(p)}>
            <Trash2 />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Programs"
        description="Degree programs that students belong to."
        actions={
          <Button
            onClick={() => {
              setEditing(undefined)
              setFormOpen(true)
            }}
          >
            <Plus /> New program
          </Button>
        }
      />

      <ListToolbar onClear={clear} canClear={hasActive}>
        <SearchInput value={params.search ?? ''} onChange={setSearch} placeholder="Search by code or name" />
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
        getRowId={(p) => p.id}
        emptyTitle="No programs found"
        emptyDescription="Create a program, or adjust the search and filters."
      />

      <ProgramFormDialog open={formOpen} onOpenChange={setFormOpen} program={editing} />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete program?"
        description={`"${deleting?.name ?? ''}" will be permanently deleted. This is blocked if students still belong to it.`}
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting)}
      />
    </>
  )
}

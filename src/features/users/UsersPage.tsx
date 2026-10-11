import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, UserX } from 'lucide-react'
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
import { usersApi } from '@/lib/api/endpoints/resources'
import { ACTIVE_STATUSES, ROLES, ROLE_LABELS, type User } from '@/lib/api/types'
import { useCurrentUser } from '@/lib/auth/useAuth'
import { formatDate } from '@/lib/format'
import { handleApiError } from '@/lib/forms/applyApiErrors'
import { keys } from '@/lib/query/keys'

import { UserFormDialog } from './UserFormDialog'

const FILTERS = ['role', 'status'] as const

const ROLE_OPTIONS: ToolbarOption[] = ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))
const STATUS_OPTIONS: ToolbarOption[] = ACTIVE_STATUSES.map((s) => ({
  value: s,
  label: s.charAt(0).toUpperCase() + s.slice(1),
}))

export function UsersPage() {
  const queryClient = useQueryClient()
  const me = useCurrentUser()
  const { params, hasActive, clear, setPage, setPerPage, setSort, setSearch, setFilter } = useListParams(FILTERS, {
    defaultSort: '-created_at,-id',
  })

  const [editing, setEditing] = useState<User | undefined>()
  const [formOpen, setFormOpen] = useState(false)
  const [deactivating, setDeactivating] = useState<User | null>(null)

  const query = useQuery({
    queryKey: keys.list('users', params),
    queryFn: () => usersApi.list(params),
    placeholderData: (previous) => previous,
  })

  // DELETE /users/{id} sets the account to inactive; it does not remove the row.
  const deactivate = useMutation({
    mutationFn: (user: User) => usersApi.remove(user.id),
    onSuccess: () => {
      toast.success('User deactivated.')
      queryClient.invalidateQueries({ queryKey: keys.resource('users') })
      queryClient.invalidateQueries({ queryKey: keys.lookups.instructors })
      setDeactivating(null)
    },
    onError: (error) => {
      handleApiError(error)
      setDeactivating(null)
    },
  })

  const columns: Column<User>[] = [
    {
      id: 'name',
      header: 'Name',
      sortKey: 'name',
      cell: (u) => (
        <div className="flex flex-col">
          <span className="font-medium">{u.name}</span>
          <span className="text-ink-secondary">{u.email}</span>
        </div>
      ),
    },
    { id: 'role', header: 'Role', sortKey: 'role', cell: (u) => ROLE_LABELS[u.role] },
    { id: 'status', header: 'Status', sortKey: 'status', cell: (u) => <StatusBadge status={u.status} /> },
    { id: 'created', header: 'Created', sortKey: 'created_at', className: 'tabular-nums', cell: (u) => formatDate(u.created_at) },
    {
      id: 'actions',
      header: '',
      className: 'w-24 text-right',
      cell: (u) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Edit ${u.name}`}
            onClick={() => {
              setEditing(u)
              setFormOpen(true)
            }}
          >
            <Pencil />
          </Button>
          {u.status === 'active' && u.id !== me.id && (
            <Button variant="ghost" size="icon" aria-label={`Deactivate ${u.name}`} onClick={() => setDeactivating(u)}>
              <UserX />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Users"
        description="Accounts and roles. Student logins are created with the student; manage the rest here."
        actions={
          <Button
            onClick={() => {
              setEditing(undefined)
              setFormOpen(true)
            }}
          >
            <Plus /> New user
          </Button>
        }
      />

      <ListToolbar onClear={clear} canClear={hasActive}>
        <SearchInput value={params.search ?? ''} onChange={setSearch} placeholder="Search name or email" />
        <FilterSelect value={params.role} onChange={(v) => setFilter('role', v)} allLabel="All roles" options={ROLE_OPTIONS} />
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
        getRowId={(u) => u.id}
        emptyTitle="No users found"
        emptyDescription="Add an account, or adjust the search and filters."
      />

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editing} />

      <ConfirmDialog
        open={deactivating !== null}
        onOpenChange={(open) => !open && setDeactivating(null)}
        title="Deactivate user?"
        description={`${deactivating?.name ?? 'This user'} will no longer be able to sign in. You can reactivate the account later by editing it.`}
        confirmLabel="Deactivate"
        destructive
        loading={deactivate.isPending}
        onConfirm={() => deactivating && deactivate.mutate(deactivating)}
      />
    </>
  )
}

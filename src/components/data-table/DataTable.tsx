import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

import { EmptyState } from '@/components/EmptyState'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Paginated } from '@/lib/api/types'
import { cn } from '@/lib/utils'

export interface Column<T> {
  id: string
  header: string
  cell: (row: T) => ReactNode
  className?: string
  /** API column to sort by; makes the header clickable. Must be a real column of the resource (an unknown one is a 500). */
  sortKey?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  result: Paginated<T> | undefined
  isLoading: boolean
  isError?: boolean
  onRetry?: () => void
  perPage: number
  /** Current API `sort` string (`-` prefix = descending). Highlights the active column header. */
  sort?: string
  onSort?: (sort: string) => void
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: number) => void
  getRowId: (row: T) => string | number
  emptyTitle?: string
  emptyDescription?: string
  /** When a search/filter is applied, the empty block offers to clear it. */
  onClearFilters?: () => void
}

const PER_PAGE_OPTIONS = [15, 30, 50, 100]

export function DataTable<T>({
  columns,
  result,
  isLoading,
  isError,
  onRetry,
  perPage,
  sort,
  onSort,
  onPageChange,
  onPerPageChange,
  getRowId,
  emptyTitle = 'Nothing here yet',
  emptyDescription = 'No records match the current filters.',
  onClearFilters,
}: DataTableProps<T>) {
  if (isError) {
    return (
      <Alert tone="error">
        <AlertTitle>Could not load this list</AlertTitle>
        <AlertDescription>
          Something went wrong while fetching the data.{' '}
          {onRetry && (
            <button type="button" className="font-semibold underline" onClick={onRetry}>
              Try again
            </button>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  const meta = result?.meta
  const items = result?.items ?? []

  if (!isLoading && items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card">
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={
            onClearFilters && (
              <Button variant="outline" size="sm" className="mt-2" onClick={onClearFilters}>
                Clear filters
              </Button>
            )
          }
        />
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((col) => {
              const key = col.sortKey
              if (!key || !onSort) {
                return (
                  <TableHead key={col.id} className={col.className}>
                    {col.header}
                  </TableHead>
                )
              }
              const direction = sort === key ? 'asc' : sort === `-${key}` ? 'desc' : null
              const Icon = direction === 'asc' ? ArrowUp : direction === 'desc' ? ArrowDown : ArrowUpDown
              return (
                <TableHead
                  key={col.id}
                  className={col.className}
                  aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none'}
                >
                  {/* First click sorts ascending, then it toggles between descending and ascending. */}
                  <button
                    type="button"
                    className="-mx-2 inline-flex items-center gap-1.5 rounded px-2 py-1 uppercase hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
                    onClick={() => onSort(direction === 'asc' ? `-${key}` : key)}
                  >
                    {col.header}
                    <Icon className={cn('size-3.5', direction ? 'text-title' : 'text-ink-muted')} aria-hidden />
                  </button>
                </TableHead>
              )
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 5 }, (_, i) => (
              <TableRow key={`sk-${i}`} className="hover:bg-transparent">
                {columns.map((col) => (
                  <TableCell key={col.id}>
                    <Skeleton className="h-4 w-3/4" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          {!isLoading &&
            items.map((row) => (
              <TableRow key={getRowId(row)}>
                {columns.map((col) => (
                  <TableCell key={col.id} className={col.className}>
                    {col.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
        </TableBody>
      </Table>

      {meta && meta.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle px-4 py-3">
          <p className="type-caption" aria-live="polite">
            Showing {meta.from}–{meta.to} of {meta.total}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="type-caption">Rows</span>
              <Select value={String(perPage)} onValueChange={(v) => onPerPageChange(Number(v))}>
                <SelectTrigger className="h-8 w-20" aria-label="Rows per page">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PER_PAGE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className={cn('size-8')}
                disabled={meta.current_page <= 1}
                onClick={() => onPageChange(meta.current_page - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft />
              </Button>
              <span className="type-caption min-w-16 text-center">
                {meta.current_page} / {meta.last_page}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                disabled={meta.current_page >= meta.last_page}
                onClick={() => onPageChange(meta.current_page + 1)}
                aria-label="Next page"
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

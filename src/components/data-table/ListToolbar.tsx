import { X } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface ToolbarOption {
  value: string
  label: string
}

interface ListToolbarProps {
  children: ReactNode
  onClear: () => void
  /** Anything to clear? Keeps the button dimmed until a search, filter or sort is applied. */
  canClear: boolean
}

/**
 * One bordered bar above a list: search, filters, then Clear. Sorting is done from the table headers. Controls grow to fill the
 * row and wrap to full width on small screens.
 */
export function ListToolbar({ children, onClear, canClear }: ListToolbarProps) {
  return (
    <div
      role="search"
      className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3"
    >
      {children}
      <Button
        type="button"
        variant="ghost"
        className="text-ink-secondary sm:ml-auto"
        disabled={!canClear}
        onClick={onClear}
      >
        <X /> Clear
      </Button>
    </div>
  )
}

interface FilterSelectProps {
  value: string | undefined
  onChange: (value: string | undefined) => void
  /** Label of the "no filter" choice, e.g. "All statuses". */
  allLabel: string
  options: ToolbarOption[]
  className?: string
}

const ALL = '__all__'

/** A dropdown filter whose first choice removes the filter. */
export function FilterSelect({ value, onChange, allLabel, options, className }: FilterSelectProps) {
  return (
    <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? undefined : v)}>
      <SelectTrigger className={cn('min-w-40 flex-1 sm:max-w-60', className)} aria-label={`Filter: ${allLabel}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

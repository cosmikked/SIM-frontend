import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export interface IdOption {
  id: number
  label: string
}

interface IdSelectProps {
  id?: string
  value: number | undefined
  onChange: (id: number) => void
  options: IdOption[]
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  'aria-describedby'?: string
  'aria-label'?: string
}

/** Radix Select works in strings; API ids are integers. This converts at the boundary. */
export function IdSelect({ value, onChange, options, placeholder, invalid, ...rest }: IdSelectProps) {
  return (
    <Select
      value={value ? String(value) : undefined}
      onValueChange={(v) => onChange(Number(v))}
      disabled={rest.disabled}
    >
      <SelectTrigger
        id={rest.id}
        aria-label={rest['aria-label']}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={rest['aria-describedby']}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.length === 0 && <p className="px-2 py-1.5 text-sm text-ink-muted">Nothing to choose from.</p>}
        {options.map((o) => (
          <SelectItem key={o.id} value={String(o.id)}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

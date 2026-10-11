import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { MonoId } from '@/components/MonoId'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { studentsApi } from '@/lib/api/endpoints/resources'
import type { Student } from '@/lib/api/types'
import { studentName } from '@/lib/format'
import { keys } from '@/lib/query/keys'

interface StudentPickerProps {
  id: string
  value: Student | null
  onChange: (student: Student | null) => void
  invalid?: boolean
  'aria-describedby'?: string
  disabled?: boolean
}

const MIN_CHARS = 2
const RESULT_LIMIT = 8

/**
 * Search-as-you-type student picker (the UI kit has no combobox). Results render inline under
 * the input rather than in a popover, so it behaves inside a dialog's focus trap.
 * The API searches first name, last name and student number.
 */
export function StudentPicker({ id, value, onChange, invalid, disabled, ...rest }: StudentPickerProps) {
  const [text, setText] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(text.trim()), 250)
    return () => clearTimeout(timer)
  }, [text])

  const searching = debounced.length >= MIN_CHARS
  const params = { search: debounced, per_page: RESULT_LIMIT, sort: 'last_name' }
  const query = useQuery({
    queryKey: keys.list('students', { picker: true, ...params }),
    queryFn: () => studentsApi.list(params),
    enabled: searching && !value,
  })

  if (value) {
    return (
      <div
        id={id}
        className="flex items-center justify-between gap-2 rounded-md border border-input bg-card px-3 py-1.5 text-sm"
      >
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{studentName(value)}</span>
          <MonoId>{value.student_number}</MonoId>
        </span>
        {!disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Choose a different student"
            onClick={() => {
              onChange(null)
              setText('')
              setDebounced('')
            }}
          >
            <X />
          </Button>
        )}
      </div>
    )
  }

  const results = query.data?.items ?? []
  const listId = `${id}-results`

  return (
    <div className="flex flex-col gap-2">
      <Input
        id={id}
        role="combobox"
        aria-expanded={searching}
        aria-controls={listId}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={rest['aria-describedby']}
        autoComplete="off"
        placeholder="Search by name or student number"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {text.trim().length > 0 && !searching && (
        <p className="type-caption">Type at least {MIN_CHARS} characters.</p>
      )}
      {searching && (
        <ul id={listId} role="listbox" aria-label="Matching students" className="max-h-52 overflow-y-auto rounded-md border bg-card">
          {query.isLoading && <li className="px-3 py-2 text-sm text-ink-muted">Searching…</li>}
          {query.isError && <li className="px-3 py-2 text-sm text-error-fg">Search failed. Try again.</li>}
          {query.isSuccess && results.length === 0 && (
            <li className="px-3 py-2 text-sm text-ink-muted">No students match “{debounced}”.</li>
          )}
          {results.map((s) => (
            <li key={s.id} role="option" aria-selected={false}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                onClick={() => onChange(s)}
              >
                <span className="truncate">{studentName(s)}</span>
                <MonoId>{s.student_number}</MonoId>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

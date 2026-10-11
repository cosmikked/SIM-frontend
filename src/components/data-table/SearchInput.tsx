import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Input } from '@/components/ui/input'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  delay?: number
}

/** Debounced search box; the URL only updates once typing pauses. */
export function SearchInput({ value, onChange, placeholder = 'Search', delay = 300 }: SearchInputProps) {
  const [draft, setDraft] = useState(value)
  const [seenValue, setSeenValue] = useState(value)

  // Follow external changes (back button, cleared filters) without an effect.
  if (value !== seenValue) {
    setSeenValue(value)
    setDraft(value)
  }

  useEffect(() => {
    if (draft === value) return
    const timer = setTimeout(() => onChange(draft), delay)
    return () => clearTimeout(timer)
  }, [draft, value, delay, onChange])

  return (
    <div className="relative min-w-52 flex-[2_1_16rem]">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
      <Input
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pl-9"
      />
    </div>
  )
}

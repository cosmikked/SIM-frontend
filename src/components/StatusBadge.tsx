import { Badge } from '@/components/ui/badge'

type Tone = 'success' | 'warning' | 'error' | 'neutral'

const TONES: Record<string, Tone> = {
  // success
  active: 'success',
  enrolled: 'success',
  published: 'success',
  regular: 'success',
  open: 'success',
  // warning
  draft: 'warning',
  irregular: 'warning',
  extendee: 'warning',
  inc: 'warning',
  // error
  dropped: 'error',
  cancelled: 'error',
  // neutral
  inactive: 'neutral',
  closed: 'neutral',
  completed: 'neutral',
}

const LABELS: Record<string, string> = { inc: 'INC' }

export function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase()
  const label = LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1)
  return <Badge tone={TONES[key] ?? 'neutral'}>{label}</Badge>
}

import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

/** Student numbers, IDs and course codes: same Inter family as the rest of the UI, with tabular figures. */
export function MonoId({ className, ...props }: ComponentProps<'span'>) {
  return <span className={cn('type-mono-id text-ink-secondary', className)} {...props} />
}

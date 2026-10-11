import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-tint text-title">
        <Inbox className="size-5" />
      </span>
      <p className="type-card">{title}</p>
      {description && <p className="type-caption max-w-sm">{description}</p>}
      {action}
    </div>
  )
}

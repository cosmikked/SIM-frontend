import type { ReactNode } from 'react'

import { ThemeToggle } from '@/components/ThemeToggle'

interface AuthLayoutProps {
  title: string
  description?: string
  children: ReactNode
}

export function AuthLayout({ title, description, children }: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="hidden flex-col justify-between bg-brand p-10 text-on-brand lg:flex">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-md bg-accent-brand font-bold text-on-brand">
            S
          </span>
          <span className="text-lg font-bold tracking-wide">SIMS</span>
        </div>
        <div className="max-w-sm">
          <h2 className="text-[1.75rem] leading-tight font-bold tracking-[-0.01em]">Student Information Management</h2>
          <p className="mt-3 text-sm leading-normal text-on-brand-muted">
            Terms, offerings, enrollments and grades in one place.
          </p>
        </div>
        <p className="text-[0.78125rem] text-on-brand-subtle">&copy; SIMS</p>
      </aside>

      <main className="relative flex items-center justify-center px-4 py-10">
        <ThemeToggle className="absolute top-4 right-4" />
        <div className="w-full max-w-sm">
          <h1 className="type-page-title">{title}</h1>
          {description && <p className="mt-1 mb-6 text-sm text-ink-muted">{description}</p>}
          {!description && <div className="mb-6" />}
          {children}
        </div>
      </main>
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, BookOpen, ClipboardList, ScrollText, Users, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  academicTermsApi,
  courseOfferingsApi,
  enrollmentsApi,
  gradesApi,
  studentsApi,
} from '@/lib/api/endpoints/resources'
import type { AcademicTerm } from '@/lib/api/types'
import { useCurrentUser } from '@/lib/auth/useAuth'
import { formatDate, termLabel } from '@/lib/format'
import { keys } from '@/lib/query/keys'
import { cn } from '@/lib/utils'

import { TermReadiness } from '../academic-terms/TermReadiness'
import { isIncPast, isPast } from '../grading/gradeRules'

const DAY_MS = 86_400_000

function daysUntil(when: Date): number {
  return Math.ceil((when.getTime() - Date.now()) / DAY_MS)
}

/** A count from a paginated list: ask for one row and read `meta.total`. */
function useTotal(
  resource: string,
  filters: Record<string, string>,
  fetchPage: (params: object) => Promise<{ meta: { total: number } }>,
) {
  const params = { ...filters, per_page: 1 }
  return useQuery({
    queryKey: keys.list(resource, params),
    queryFn: () => fetchPage(params),
    select: (page) => page.meta.total,
    staleTime: 60_000,
  })
}

export function DashboardPage() {
  const role = useCurrentUser().role

  const students = useTotal('students', {}, studentsApi.list)
  const sections = useTotal('course-offerings', { status: 'open' }, courseOfferingsApi.list)
  const enrolled = useTotal('enrollments', { status: 'enrolled' }, enrollmentsApi.list)
  // Registrars see published grades only, so this counts what has been released to them.
  const inc = useTotal('grades', { is_inc: 'true' }, gradesApi.list)

  const terms = useQuery({
    queryKey: keys.list('academic-terms', { status: 'active', per_page: 100 }),
    queryFn: () => academicTermsApi.list({ status: 'active', per_page: 100, sort: '-start_date' }),
    staleTime: 60_000,
  })

  return (
    <>
      <PageHeader title="Dashboard" description="Where the school year stands, and what needs attention." />

      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <li>
          <Stat label="Students on record" total={students} to="/students" icon={Users} />
        </li>
        <li>
          <Stat label="Open sections" total={sections} to="/course-offerings?status=open" icon={BookOpen} />
        </li>
        <li>
          <Stat label="Current enrollments" total={enrolled} to="/enrollments?status=enrolled" icon={ClipboardList} />
        </li>
        <li>
          <Stat
          label={role === 'administrator' ? 'INC grades' : 'Published INC grades'}
          total={inc}
          to="/grades?view=all&is_inc=true"
          icon={ScrollText}
        />
        </li>
      </ul>

      <section aria-labelledby="quick-actions" className="mt-6">
        <h2 id="quick-actions" className="sr-only">
          Quick actions
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Button asChild size="lg" variant="outline">
            <Link to="/enrollments">
              <ClipboardList /> Enroll a student
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/course-offerings/new">
              <BookOpen /> New section
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/students">
              <Users /> Students
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/grades">
              <ScrollText /> Review grades
            </Link>
          </Button>
        </div>
      </section>

      <h2 className="type-section mt-10 mb-4">Active {terms.data?.items.length === 1 ? 'term' : 'terms'}</h2>
      <ActiveTerms query={terms} />
    </>
  )
}

interface StatProps {
  label: string
  total: { data: number | undefined; isError: boolean }
  to: string
  icon: LucideIcon
}

function Stat({ label, total, to, icon: Icon }: StatProps) {
  let value: ReactNode = <Skeleton className="h-9 w-20" />
  if (total.isError) value = <span className="text-ink-muted">—</span>
  else if (total.data !== undefined) value = total.data.toLocaleString()

  return (
    <Link
      to={to}
      className={cn(
        'group relative flex h-full flex-col gap-5 rounded-xl border bg-card p-4 shadow-sm transition-[box-shadow,border-color] duration-150 hover:border-tint-border hover:shadow-md sm:p-5',
      )}
    >
      <div className="flex items-start justify-between">
        <span
          className="flex size-9 items-center justify-center rounded-lg bg-tint text-title"
          aria-hidden
        >
          <Icon className="size-[1.125rem]" />
        </span>
        <ArrowUpRight
          aria-hidden
          className="size-4 text-ink-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-[2.25rem] leading-none font-bold tracking-tight text-ink tabular-nums">
          {value}
        </p>
        <span className="text-sm font-medium text-ink-secondary">{label}</span>
      </div>
    </Link>
  )
}

function ActiveTerms({ query }: { query: ReturnType<typeof useQuery<{ items: AcademicTerm[] }>> }) {
  if (query.isLoading) return <Skeleton className="h-52 w-full rounded-xl" />

  if (query.isError) {
    return (
      <Alert tone="error">
        <AlertTitle>Could not load the active term</AlertTitle>
        <AlertDescription>
          <button type="button" className="font-semibold underline" onClick={() => query.refetch()}>
            Try again
          </button>
        </AlertDescription>
      </Alert>
    )
  }

  const terms = query.data?.items ?? []
  if (terms.length === 0) {
    return (
      <Card>
        <EmptyState
          title="No active term"
          description="Set a term to active so sections, enrollment and grading can start."
          action={
            <Button asChild variant="outline">
              <Link to="/academic-terms">Go to academic terms</Link>
            </Button>
          }
        />
      </Card>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {terms.map((term) => (
        <TermCard key={term.id} term={term} />
      ))}
    </div>
  )
}

function TermCard({ term }: { term: AcademicTerm }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{termLabel(term)}</CardTitle>
        <p className="type-caption tabular-nums">
          {formatDate(term.start_date)} – {formatDate(term.end_date)}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <TermReadiness term={term} />
        <dl className="divide-y divide-border-subtle rounded-lg border border-border-subtle">
          <Deadline label="Midterm grading" value={term.midterm_grading_deadline} />
          <Deadline label="Final grading" value={term.final_grading_deadline} />
          <Deadline label="INC completion" value={term.inc_completion_deadline} isDate />
        </dl>
        <Button asChild variant="secondary" className="self-start">
          <Link to="/academic-terms">Manage terms and deadlines</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

type DeadlineTone = 'ok' | 'soon' | 'missing' | 'done'

const DOT: Record<DeadlineTone, string> = {
  ok: 'bg-success-fg',
  soon: 'bg-warning-fg',
  missing: 'bg-warning-fg',
  done: 'bg-ink-muted',
}
const TEXT: Record<DeadlineTone, string> = {
  ok: 'text-success-fg',
  soon: 'text-warning-fg',
  missing: 'text-warning-fg',
  done: 'text-ink-muted',
}

/** One grading deadline: the date, plus a status in words with a colored dot (never color alone). */
function Deadline({ label, value, isDate = false }: { label: string; value: string | null; isDate?: boolean }) {
  let tone: DeadlineTone = 'missing'
  let text = 'Not set'

  if (value) {
    const when = new Date(value)
    const days = daysUntil(when)
    if (isDate ? isIncPast(when) : isPast(when)) {
      tone = 'done'
      text = 'Passed'
    } else if (days <= 7) {
      tone = 'soon'
      text = days <= 1 ? 'Due within a day' : `In ${days} days`
    } else {
      tone = 'ok'
      text = `In ${days} days`
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
      <div className="flex flex-col">
        <dt className="text-sm font-medium text-ink">{label}</dt>
        <dd className="text-[0.8125rem] text-ink-secondary tabular-nums">{formatDate(value)}</dd>
      </div>
      <span className={cn('inline-flex items-center gap-2 text-sm font-medium', TEXT[tone])}>
        <span className={cn('size-2 rounded-full', DOT[tone])} aria-hidden />
        {text}
      </span>
    </div>
  )
}

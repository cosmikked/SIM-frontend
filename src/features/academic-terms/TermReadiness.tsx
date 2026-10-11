import { useQuery } from '@tanstack/react-query'
import { CircleAlert, CircleCheck } from 'lucide-react'
import { Link } from 'react-router'

import { Badge } from '@/components/ui/badge'
import { courseOfferingsApi } from '@/lib/api/endpoints/resources'
import type { AcademicTerm } from '@/lib/api/types'
import { keys } from '@/lib/query/keys'

/** How many of the three grading deadlines are set. */
function deadlinesSet(term: AcademicTerm): number {
  return [term.midterm_grading_deadline, term.final_grading_deadline, term.inc_completion_deadline].filter(Boolean)
    .length
}

/**
 * Where a term stands in the PRD 6.1 setup flow: are the grading deadlines set, and does it
 * have sections yet. Text carries the meaning; the icon and tone only reinforce it.
 */
export function TermReadiness({ term }: { term: AcademicTerm }) {
  const set = deadlinesSet(term)

  // per_page=1: only meta.total is needed.
  const sections = useQuery({
    queryKey: keys.list('course-offerings', { academic_term_id: term.id, per_page: 1 }),
    queryFn: () => courseOfferingsApi.list({ academic_term_id: term.id, per_page: 1 }),
    staleTime: 60_000,
  })
  const count = sections.data?.meta.total

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge tone={set === 3 ? 'success' : 'warning'}>
        {set === 3 ? <CircleCheck className="mr-1 size-3" aria-hidden /> : <CircleAlert className="mr-1 size-3" aria-hidden />}
        {set === 3 ? 'Deadlines set' : set === 0 ? 'No deadlines' : `${set} of 3 deadlines`}
      </Badge>

      {count === undefined ? (
        <Badge tone="neutral">{sections.isError ? 'Sections unavailable' : 'Counting sections…'}</Badge>
      ) : count > 0 ? (
        <Link to={`/course-offerings?academic_term_id=${term.id}`} className="rounded-full">
          <Badge tone="success" className="hover:underline">
            <CircleCheck className="mr-1 size-3" aria-hidden />
            {count} {count === 1 ? 'section' : 'sections'}
          </Badge>
        </Link>
      ) : (
        <Link
          to={`/course-offerings/new?academic_term_id=${term.id}`}
          className="rounded-full"
          aria-label={`No sections yet. Create a section for ${term.academic_year} ${term.term}`}
        >
          <Badge tone="warning" className="hover:underline">
            <CircleAlert className="mr-1 size-3" aria-hidden />
            No sections · Create one
          </Badge>
        </Link>
      )}
    </div>
  )
}

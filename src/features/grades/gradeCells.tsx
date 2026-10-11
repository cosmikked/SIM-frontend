import { StatusBadge } from '@/components/StatusBadge'
import type { Grade } from '@/lib/api/types'

import { score } from './gradeFormat'

interface PeriodCellProps {
  grade: Grade | null | undefined
  period: 'midterm' | 'final'
  /** Shown when there is no grade row at all. Registrars never get unpublished grades, so the default is "Not released". */
  noGradeLabel?: string
}

/**
 * Raw score and equivalent grade for one period. Periods the API holds back (not yet
 * published, for registrars) come without a status or scores and read "Not released".
 */
export function PeriodCell({ grade, period, noGradeLabel = 'Not released' }: PeriodCellProps) {
  const status = period === 'midterm' ? grade?.midterm_status : grade?.final_status
  const raw = period === 'midterm' ? grade?.midterm_raw_score : grade?.final_raw_score
  const equivalent = period === 'midterm' ? grade?.midterm_equivalent_grade : grade?.final_equivalent_grade

  if (!grade) return <span className="text-ink-muted">{noGradeLabel}</span>
  if (status === undefined) return <span className="text-ink-muted">Not released</span>
  if (raw === null || raw === undefined) {
    return <span className="text-ink-muted">{status === 'draft' ? 'Not graded' : '—'}</span>
  }

  return (
    <div className="flex items-center gap-2 tabular-nums">
      <span>
        {score(raw)} <span className="text-ink-muted">→</span> <span className="font-medium">{score(equivalent, 1)}</span>
      </span>
      {status === 'draft' && <StatusBadge status="draft" />}
    </div>
  )
}

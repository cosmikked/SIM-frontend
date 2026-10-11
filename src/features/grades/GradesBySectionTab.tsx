import { useQuery } from '@tanstack/react-query'
import { ClipboardEdit } from 'lucide-react'
import { Link } from 'react-router'

import { DataTable, type Column } from '@/components/data-table/DataTable'
import { FilterSelect, ListToolbar, type ToolbarOption } from '@/components/data-table/ListToolbar'
import { SearchInput } from '@/components/data-table/SearchInput'
import { useListParams } from '@/components/data-table/useListParams'
import { EmptyState } from '@/components/EmptyState'
import { MonoId } from '@/components/MonoId'
import { StatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { courseOfferingsApi } from '@/lib/api/endpoints/resources'
import { ENROLLMENT_STATUSES, type Enrollment, type EnrollmentStatus } from '@/lib/api/types'
import { canAccess } from '@/lib/auth/permissions'
import { useCurrentUser } from '@/lib/auth/useAuth'
import { studentName, termLabel } from '@/lib/format'
import { keys } from '@/lib/query/keys'
import { useLookups } from '@/lib/query/useLookups'

import { remarksTone } from '../student-portal/remarks'
import { PeriodCell } from './gradeCells'

const FILTERS = ['offering_id', 'status'] as const

const STATUS_OPTIONS: ToolbarOption[] = ENROLLMENT_STATUSES.map((s) => ({
  value: s,
  label: s.charAt(0).toUpperCase() + s.slice(1),
}))

/** One section's roster with its grades. Registrars see published periods only. */
export function GradesBySectionTab() {
  const role = useCurrentUser().role
  const canCorrect = canAccess(role, 'grading')
  const { params, hasActive, clear, setPage, setPerPage, setSearch, setFilter } = useListParams(FILTERS, { defaultSort: '-created_at,-id' })
  const lookups = useLookups({ courses: true, terms: true, offerings: true })

  const offeringId = Number(params.offering_id) || undefined

  const sectionOptions: ToolbarOption[] = [...lookups.offerings.values()].map((o) => {
    const course = lookups.courses.get(o.course_id)
    const term = lookups.terms.get(o.academic_term_id)
    return {
      value: String(o.id),
      label: `${course?.course_code ?? `#${o.course_id}`} ${o.section}${term ? ` · ${termLabel(term)}` : ''}`,
    }
  })

  const rosterParams = { page: params.page, per_page: params.per_page, search: params.search, status: params.status as EnrollmentStatus | undefined }
  const query = useQuery({
    queryKey: keys.list('course-offering-roster', { offering: offeringId, ...rosterParams }),
    queryFn: () => courseOfferingsApi.roster(offeringId!, rosterParams),
    enabled: offeringId !== undefined,
    placeholderData: (previous) => previous,
  })

  const columns: Column<Enrollment>[] = [
    {
      id: 'student',
      header: 'Student',
      cell: (e) => (
        <div className="flex flex-col">
          <Link to={`/students/${e.student_id}`} className="font-medium hover:underline">
            {e.student ? studentName(e.student) : `Student #${e.student_id}`}
          </Link>
          {e.student && <MonoId>{e.student.student_number}</MonoId>}
        </div>
      ),
    },
    { id: 'status', header: 'Enrollment', cell: (e) => <StatusBadge status={e.status} /> },
    {
      id: 'midterm',
      header: 'Midterm',
      className: 'whitespace-nowrap',
      cell: (e) => <PeriodCell grade={e.grade} period="midterm" noGradeLabel={canCorrect ? 'Not graded' : undefined} />,
    },
    {
      id: 'final',
      header: 'Final',
      className: 'whitespace-nowrap',
      cell: (e) => <PeriodCell grade={e.grade} period="final" noGradeLabel={canCorrect ? 'Not graded' : undefined} />,
    },
    {
      id: 'remarks',
      header: 'Remarks',
      cell: (e) => (e.grade?.remarks ? <Badge tone={remarksTone(e.grade.remarks)}>{e.grade.remarks}</Badge> : '—'),
    },
  ]

  return (
    <>
      <ListToolbar onClear={clear} canClear={hasActive}>
        <FilterSelect
          value={params.offering_id}
          onChange={(v) => setFilter('offering_id', v)}
          allLabel="Choose a section"
          options={sectionOptions}
          className="sm:max-w-80"
        />
        {offeringId !== undefined && (
          <>
            <SearchInput value={params.search ?? ''} onChange={setSearch} placeholder="Search name or student number" />
            <FilterSelect
              value={params.status}
              onChange={(v) => setFilter('status', v)}
              allLabel="All statuses"
              options={STATUS_OPTIONS}
            />
          </>
        )}
        {offeringId !== undefined && canCorrect && (
          <Button asChild variant="outline">
            <Link to={`/course-offerings/${offeringId}/grading`}>
              <ClipboardEdit /> Open grading sheet
            </Link>
          </Button>
        )}
      </ListToolbar>

      {offeringId === undefined ? (
        <Card>
          <EmptyState title="Choose a section" description="Pick a section above to see its students and their grades." />
        </Card>
      ) : (
        <DataTable
          columns={columns}
          result={query.data}
          isLoading={query.isLoading}
          isError={query.isError}
          onRetry={() => query.refetch()}
          perPage={params.per_page ?? 15}
          onClearFilters={params.search || params.status ? () => clear() : undefined}
          onPageChange={setPage}
          onPerPageChange={setPerPage}
          getRowId={(e) => e.id}
          emptyTitle="No students found"
          emptyDescription="Nobody is enrolled in this section, or the search matched no one."
        />
      )}
    </>
  )
}

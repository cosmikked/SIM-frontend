import { useSearchParams } from 'react-router'

import { PageHeader } from '@/components/PageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCurrentUser } from '@/lib/auth/useAuth'

import { AllGradesTab } from './AllGradesTab'
import { GradesBySectionTab } from './GradesBySectionTab'

const VIEWS = ['section', 'all'] as const
type View = (typeof VIEWS)[number]

export function GradesPage() {
  const role = useCurrentUser().role
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('view') as View | null
  const view: View = requested && VIEWS.includes(requested) ? requested : 'section'

  return (
    <>
      <PageHeader
        title="Grades"
        description={
          role === 'administrator'
            ? 'Read-only view of every grade, drafts included. Correct grades from a section’s grading sheet.'
            : 'Published grades, read-only. Periods an instructor has not published yet are not shown.'
        }
      />
      <Tabs
        value={view}
        // Each tab keeps its own filters in the URL, so switching starts it fresh.
        onValueChange={(next) => setSearchParams(next === 'section' ? {} : { view: next }, { replace: true })}
      >
        <TabsList>
          <TabsTrigger value="section">By section</TabsTrigger>
          <TabsTrigger value="all">All grades</TabsTrigger>
        </TabsList>
        <TabsContent value="section">
          <GradesBySectionTab />
        </TabsContent>
        <TabsContent value="all">
          <AllGradesTab />
        </TabsContent>
      </Tabs>
    </>
  )
}

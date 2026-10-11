import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/EmptyState'

/** The account has no student record (PRD section 9.3), so there is nothing to show. */
export function NoStudentRecord() {
  return (
    <Card>
      <EmptyState
        title="No student record linked to this account"
        description="Your login is not connected to a student record yet. Please contact the registrar's office."
      />
    </Card>
  )
}

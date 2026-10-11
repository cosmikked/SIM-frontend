import { PageHeader } from '@/components/PageHeader'
import { useCurrentUser } from '@/lib/auth/useAuth'

import { StudentRecordPanel } from '../grades/StudentRecordPanel'
import { NoStudentRecord } from './NoStudentRecord'

export function MyRecordPage() {
  const studentId = useCurrentUser().student_id ?? null

  return (
    <>
      <PageHeader
        title="Academic record"
        description="Your subjects grouped by term. Only published final grades are counted."
      />
      {studentId === null ? <NoStudentRecord /> : <StudentRecordPanel studentId={studentId} />}
    </>
  )
}

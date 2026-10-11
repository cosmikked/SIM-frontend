import { PageHeader } from '@/components/PageHeader'
import { useCurrentUser } from '@/lib/auth/useAuth'

import { StudentGradesPanel } from '../grades/StudentGradesPanel'
import { NoStudentRecord } from './NoStudentRecord'

export function MyGradesPage() {
  const studentId = useCurrentUser().student_id ?? null

  return (
    <>
      <PageHeader
        title="My grades"
        description="Midterm and final results appear here once your instructor publishes them."
      />
      {studentId === null ? <NoStudentRecord /> : <StudentGradesPanel studentId={studentId} />}
    </>
  )
}

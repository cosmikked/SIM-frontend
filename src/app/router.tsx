import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'

import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { DesignPage } from '@/features/dev/DesignPage'
import { AcademicTermsPage } from '@/features/academic-terms/AcademicTermsPage'
import { CourseOfferingFormPage } from '@/features/course-offerings/CourseOfferingFormPage'
import { CourseOfferingsPage } from '@/features/course-offerings/CourseOfferingsPage'
import { CoursesPage } from '@/features/courses/CoursesPage'
import { GradesPage } from '@/features/grades/GradesPage'
import { GradingSheetPage } from '@/features/grading/GradingSheetPage'
import { MyEnrollmentsPage } from '@/features/student-portal/MyEnrollmentsPage'
import { MyGradesPage } from '@/features/student-portal/MyGradesPage'
import { MyRecordPage } from '@/features/student-portal/MyRecordPage'
import { MyOfferingsPage } from '@/features/grading/MyOfferingsPage'
import { EnrollmentsPage } from '@/features/enrollments/EnrollmentsPage'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { ProfilePage } from '@/features/auth/ProfilePage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'
import { Forbidden, NotFound } from '@/features/placeholders/Placeholder'
import { ProgramsPage } from '@/features/programs/ProgramsPage'
import { StudentDetailPage } from '@/features/students/StudentDetailPage'
import { StudentsPage } from '@/features/students/StudentsPage'
import { UsersPage } from '@/features/users/UsersPage'
import type { Area } from '@/lib/auth/permissions'

import { AppShell } from './AppShell'
import { HomeRedirect, RedirectIfAuthenticated, RequireArea, RequireAuth } from './guards'

/** A guarded group of routes for one permission area. */
function area(name: Area, children: RouteObject[]): RouteObject {
  return { element: <RequireArea area={name} />, children }
}

const routes: RouteObject[] = [
  // Public
  {
    element: <RedirectIfAuthenticated />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
    ],
  },
  // Reachable signed in or out: the emailed link must always work.
  { path: '/reset-password', element: <ResetPasswordPage /> },

  // Signed in
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <HomeRedirect /> },
          { path: '/profile', element: <ProfilePage /> },
          { path: '/forbidden', element: <Forbidden /> },

          // Administrator + registrar
          area('dashboard', [{ path: '/dashboard', element: <DashboardPage /> }]),
          area('programs', [{ path: '/programs', element: <ProgramsPage /> }]),
          area('courses', [{ path: '/courses', element: <CoursesPage /> }]),
          area('academic-terms', [{ path: '/academic-terms', element: <AcademicTermsPage /> }]),
          area('students', [
            { path: '/students', element: <StudentsPage /> },
            { path: '/students/:id', element: <StudentDetailPage /> },
          ]),
          area('course-offerings', [
            { path: '/course-offerings', element: <CourseOfferingsPage /> },
            { path: '/course-offerings/new', element: <CourseOfferingFormPage /> },
            { path: '/course-offerings/:id/edit', element: <CourseOfferingFormPage /> },
          ]),
          area('enrollments', [{ path: '/enrollments', element: <EnrollmentsPage /> }]),
          area('grades', [{ path: '/grades', element: <GradesPage /> }]),
          area('users', [{ path: '/users', element: <UsersPage /> }]),

          // Instructor
          area('my-offerings', [
            { path: '/my/offerings', element: <MyOfferingsPage /> },
            { path: '/my/offerings/:id/grading', element: <GradingSheetPage /> },
          ]),
          // Administrator: same sheet for any section, to correct published grades.
          area('grading', [{ path: '/course-offerings/:id/grading', element: <GradingSheetPage /> }]),

          // Student
          area('my-enrollments', [{ path: '/my/enrollments', element: <MyEnrollmentsPage /> }]),
          area('my-grades', [{ path: '/my/grades', element: <MyGradesPage /> }]),
          area('my-record', [{ path: '/my/record', element: <MyRecordPage /> }]),
        ],
      },
    ],
  },

  ...(import.meta.env.DEV ? [{ path: '/dev/design', element: <DesignPage /> }] : []),
  { path: '/home', element: <Navigate to="/" replace /> },
  { path: '*', element: <NotFound /> },
]

export const router = createBrowserRouter(routes)

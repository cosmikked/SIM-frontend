import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  DoorOpen,
  GraduationCap,
  LayoutDashboard,
  Layers,
  Library,
  ScrollText,
  Users,
  UserCog,
  type LucideIcon,
} from 'lucide-react'

import type { Area } from '@/lib/auth/permissions'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  area: Area
}

export interface NavGroup {
  heading: string
  items: NavItem[]
}

/** Items are filtered by `canAccess(role, area)` in the shell, so students never see registrar links. */
export const NAV_GROUPS: NavGroup[] = [
  {
    heading: 'Overview',
    items: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, area: 'dashboard' }],
  },
  {
    heading: 'Academics',
    items: [
      { to: '/programs', label: 'Programs', icon: Library, area: 'programs' },
      { to: '/courses', label: 'Courses', icon: BookOpen, area: 'courses' },
      { to: '/academic-terms', label: 'Academic terms', icon: CalendarDays, area: 'academic-terms' },
      { to: '/course-offerings', label: 'Course offerings', icon: Layers, area: 'course-offerings' },
    ],
  },
  {
    heading: 'People & records',
    items: [
      { to: '/students', label: 'Students', icon: GraduationCap, area: 'students' },
      { to: '/enrollments', label: 'Enrollments', icon: ClipboardList, area: 'enrollments' },
      { to: '/grades', label: 'Grades', icon: ScrollText, area: 'grades' },
      { to: '/users', label: 'Users', icon: UserCog, area: 'users' },
    ],
  },
  {
    heading: 'Teaching',
    items: [{ to: '/my/offerings', label: 'My course offerings', icon: DoorOpen, area: 'my-offerings' }],
  },
  {
    heading: 'My studies',
    items: [
      { to: '/my/enrollments', label: 'My enrollments', icon: ClipboardList, area: 'my-enrollments' },
      { to: '/my/grades', label: 'My grades', icon: ScrollText, area: 'my-grades' },
      { to: '/my/record', label: 'Academic record', icon: Users, area: 'my-record' },
    ],
  },
]

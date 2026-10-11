import { Navigate, Outlet, useLocation } from 'react-router'

import { Skeleton } from '@/components/ui/skeleton'
import { canAccess, homePath, type Area } from '@/lib/auth/permissions'
import { useAuth } from '@/lib/auth/useAuth'

function FullPageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-label="Loading">
      <Skeleton className="h-8 w-48" />
    </div>
  )
}

/** Wraps every signed-in route. Unauthenticated users go to /login and come back afterwards. */
export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <FullPageLoading />
  if (status === 'unauthenticated') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}

/** Public-only pages (login, reset): signed-in users are sent to their home. */
export function RedirectIfAuthenticated() {
  const { status, user } = useAuth()
  if (status === 'loading') return <FullPageLoading />
  if (status === 'authenticated' && user) return <Navigate to={homePath(user.role)} replace />
  return <Outlet />
}

/** Blocks areas the role may not use (the API would answer 403). */
export function RequireArea({ area }: { area: Area }) {
  const { user } = useAuth()
  if (!user) return null
  if (!canAccess(user.role, area)) return <Navigate to="/forbidden" replace />
  return <Outlet />
}

export function HomeRedirect() {
  const { user } = useAuth()
  return <Navigate to={user ? homePath(user.role) : '/login'} replace />
}

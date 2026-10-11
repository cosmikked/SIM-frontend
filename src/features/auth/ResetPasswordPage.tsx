import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { FormField } from '@/components/FormField'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authApi } from '@/lib/api/endpoints/auth'
import { resetPasswordSchema, type ResetPasswordValues } from '@/lib/api/schemas'
import { useAuth } from '@/lib/auth/useAuth'
import { handleApiError } from '@/lib/forms/applyApiErrors'
import { fieldProps } from '@/lib/forms/fieldProps'

import { AuthLayout } from './AuthLayout'

/** Target of the emailed link: /reset-password?token=...&email=... (see FRONTEND_URL in the backend). */
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const token = searchParams.get('token') ?? ''
  const email = searchParams.get('email') ?? ''

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, email },
  })

  if (!token || !email) {
    return (
      <AuthLayout title="Reset your password">
        <Alert tone="error">
          <AlertDescription>
            This reset link is incomplete. Request a new one from the{' '}
            <Link to="/forgot-password" className="font-semibold underline">
              forgot password
            </Link>{' '}
            page.
          </AlertDescription>
        </Alert>
      </AuthLayout>
    )
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      const message = await authApi.resetPassword(values)
      // A reset revokes every API token, so a session open in this browser is already dead.
      // Drop it locally; otherwise /login would bounce a signed-in user back to the app.
      if (user) await logout()
      toast.success(message || 'Password updated. You can sign in now.')
      navigate('/login', { replace: true })
    } catch (error) {
      handleApiError(error, setError)
    }
  })

  return (
    <AuthLayout title="Choose a new password" description={`For ${email}`}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <input type="hidden" {...register('token')} />
        <input type="hidden" {...register('email')} />
        {/* The API reports a bad, used or expired token on `email`. Links last 60 minutes and work once. */}
        {errors.email?.message && (
          <Alert tone="error">
            <AlertDescription>
              {errors.email.message}{' '}
              <Link
                to={{ pathname: '/forgot-password', search: `?${new URLSearchParams({ email })}` }}
                className="font-semibold underline"
              >
                Request a new link
              </Link>
            </AlertDescription>
          </Alert>
        )}
        <FormField id="password" label="New password" error={errors.password?.message} hint="At least 8 characters.">
          <Input
            type="password"
            autoComplete="new-password"
            autoFocus
            {...fieldProps('password', errors.password?.message)}
            {...register('password')}
          />
        </FormField>
        <FormField id="password_confirmation" label="Confirm password" error={errors.password_confirmation?.message}>
          <Input
            type="password"
            autoComplete="new-password"
            {...fieldProps('password_confirmation', errors.password_confirmation?.message)}
            {...register('password_confirmation')}
          />
        </FormField>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Update password'}
        </Button>
      </form>
    </AuthLayout>
  )
}

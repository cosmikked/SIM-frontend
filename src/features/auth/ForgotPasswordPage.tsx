import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router'

import { FormField } from '@/components/FormField'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authApi } from '@/lib/api/endpoints/auth'
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/lib/api/schemas'
import { handleApiError } from '@/lib/forms/applyApiErrors'
import { fieldProps } from '@/lib/forms/fieldProps'

import { AuthLayout } from './AuthLayout'

/** The backend sends at most one reset email per minute per account (passwords.users.throttle). */
const RESEND_SECONDS = 60
/** Reset links expire after 60 minutes (passwords.users.expire). */
const LINK_MINUTES = 60

/** Counts down once started; `start()` restarts it. */
function useCooldown(seconds: number) {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (remaining <= 0) return
    const timer = window.setTimeout(() => setRemaining((current) => current - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [remaining])

  const start = useCallback(() => setRemaining(seconds), [seconds])
  return { remaining, start }
}

export function ForgotPasswordPage() {
  const [searchParams] = useSearchParams()
  const [sent, setSent] = useState<{ email: string; message: string } | null>(null)
  const [resending, setResending] = useState(false)
  const cooldown = useCooldown(RESEND_SECONDS)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: searchParams.get('email') ?? '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      const message = await authApi.forgotPassword(values)
      setSent({ email: values.email, message })
      cooldown.start()
    } catch (error) {
      handleApiError(error, setError)
    }
  })

  async function resend() {
    if (!sent) return
    setResending(true)
    try {
      await authApi.forgotPassword({ email: sent.email })
    } catch (error) {
      handleApiError(error)
    } finally {
      setResending(false)
      // Restart either way: a 429 means the minute is not over yet.
      cooldown.start()
    }
  }

  return (
    <AuthLayout title="Reset your password" description="Enter your email and we will send you a reset link.">
      {sent ? (
        <div className="flex flex-col gap-4">
          <Alert tone="success">
            <AlertDescription>
              {sent.message || 'If that email is registered, a reset link has been sent.'} The link is valid for{' '}
              {LINK_MINUTES} minutes and can be used once.
            </AlertDescription>
          </Alert>
          {import.meta.env.DEV && (
            <Alert tone="neutral">
              <AlertDescription>
                Development: the email is written to <code>backend/storage/logs/laravel.log</code>, not delivered.
              </AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-1.5">
            <Button type="button" variant="outline" onClick={resend} disabled={cooldown.remaining > 0 || resending}>
              {resending ? 'Sending…' : cooldown.remaining > 0 ? `Send again in ${cooldown.remaining}s` : 'Send again'}
            </Button>
            <p className="type-caption text-center text-xs">
              Not there? Check your spam folder, or make sure you used the email on your account.
            </p>
          </div>
          <Link to="/login" className="text-center text-sm font-semibold text-accent-brand hover:underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <FormField id="email" label="Email" error={errors.email?.message}>
            <Input
              type="email"
              autoComplete="email"
              autoFocus
              {...fieldProps('email', errors.email?.message)}
              {...register('email')}
            />
          </FormField>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending…' : 'Send reset link'}
          </Button>
          <Link to="/login" className="text-center text-sm font-semibold text-accent-brand hover:underline">
            Back to sign in
          </Link>
        </form>
      )}
    </AuthLayout>
  )
}

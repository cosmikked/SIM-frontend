import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router'

import { FormField } from '@/components/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { loginSchema, type LoginValues } from '@/lib/api/schemas'
import { homePath } from '@/lib/auth/permissions'
import { useAuth } from '@/lib/auth/useAuth'
import { handleApiError } from '@/lib/forms/applyApiErrors'
import { fieldProps } from '@/lib/forms/fieldProps'

import { AuthLayout } from './AuthLayout'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  const typedEmail = useWatch({ control, name: 'email' })?.trim()

  const onSubmit = handleSubmit(async (values) => {
    try {
      const user = await login(values)
      navigate(from && from !== '/login' ? from : homePath(user.role), { replace: true })
    } catch (error) {
      handleApiError(error, setError)
    }
  })

  return (
    <AuthLayout title="Sign in" description="Use your SIMS account to continue.">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormField id="email" label="Email" error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="username"
            autoFocus
            {...fieldProps('email', errors.email?.message)}
            {...register('email')}
          />
        </FormField>
        <FormField id="password" label="Password" error={errors.password?.message}>
          <Input
            type="password"
            autoComplete="current-password"
            {...fieldProps('password', errors.password?.message)}
            {...register('password')}
          />
        </FormField>
        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
        {/* Carry what was typed so the email is not asked for twice. */}
        <Link
          to={{ pathname: '/forgot-password', search: typedEmail ? `?${new URLSearchParams({ email: typedEmail })}` : '' }}
          className="text-center text-sm font-semibold text-accent-brand hover:underline"
        >
          Forgot your password?
        </Link>
      </form>
    </AuthLayout>
  )
}

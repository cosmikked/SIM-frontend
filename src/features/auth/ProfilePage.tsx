import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FormField } from '@/components/FormField'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { authApi } from '@/lib/api/endpoints/auth'
import { profileSchema, type ProfileValues } from '@/lib/api/schemas'
import { useAuth, useCurrentUser } from '@/lib/auth/useAuth'
import { handleApiError } from '@/lib/forms/applyApiErrors'
import { fieldProps } from '@/lib/forms/fieldProps'
import { useLeaveGuard } from '@/lib/forms/useDiscardGuard'

/** Every role can edit their own name and email (role, status and password are not self-editable). */
export function ProfilePage() {
  const user = useCurrentUser()
  const { setUser } = useAuth()

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name, email: user.email },
  })

  const { confirmProps } = useLeaveGuard(isDirty)

  const onSubmit = handleSubmit(async (values) => {
    try {
      const updated = await authApi.updateMe(values)
      setUser(updated)
      reset({ name: updated.name, email: updated.email })
      toast.success('Profile updated.')
    } catch (error) {
      handleApiError(error, setError)
    }
  })

  return (
    <>
      <PageHeader title="Profile" description="Update your name and email address." />
      <Card className="max-w-lg">
        <CardContent>
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <FormField id="name" label="Name" error={errors.name?.message}>
              <Input autoComplete="name" {...fieldProps('name', errors.name?.message)} {...register('name')} />
            </FormField>
            <FormField id="email" label="Email" error={errors.email?.message}>
              <Input
                type="email"
                autoComplete="email"
                {...fieldProps('email', errors.email?.message)}
                {...register('email')}
              />
            </FormField>
            <div>
              <Button type="submit" disabled={isSubmitting || !isDirty}>
                {isSubmitting ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <ConfirmDialog {...confirmProps} />
    </>
  )
}

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FormField } from '@/components/FormField'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usersApi } from '@/lib/api/endpoints/resources'
import { toUserBody, userSchema, userUpdateSchema, type UserValues } from '@/lib/api/schemas'
import { ACTIVE_STATUSES, ROLE_LABELS, type Role, type User } from '@/lib/api/types'
import { useAuth } from '@/lib/auth/useAuth'
import { handleApiError } from '@/lib/forms/applyApiErrors'
import { fieldProps } from '@/lib/forms/fieldProps'
import { useDiscardGuard } from '@/lib/forms/useDiscardGuard'
import { keys } from '@/lib/query/keys'

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pass a user to edit them; omit to create. */
  user?: User
}

/** Student logins are created together with the student record, so they are not offered here. */
const STAFF_ROLES: Role[] = ['administrator', 'registrar', 'instructor']

const EMPTY: UserValues = { name: '', email: '', password: '', role: 'instructor', status: 'active' }

export function UserFormDialog({ open, onOpenChange, user }: UserFormDialogProps) {
  const queryClient = useQueryClient()
  const { user: me, setUser } = useAuth()
  const isSelf = !!user && user.id === me?.id
  // A student account keeps its role: it only works with a linked student record.
  const roleLocked = isSelf || user?.role === 'student'

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<UserValues>({ resolver: zodResolver(user ? userUpdateSchema : userSchema), defaultValues: EMPTY })

  // Re-seed whenever the dialog opens (or switches between create and edit).
  useEffect(() => {
    if (open) {
      reset(
        user ? { name: user.name, email: user.email, password: '', role: user.role, status: user.status } : EMPTY,
      )
    }
  }, [open, user, reset])

  const mutation = useMutation({
    mutationFn: (values: UserValues) => {
      const body = toUserBody(values)
      return user ? usersApi.update(user.id, body) : usersApi.create(body)
    },
    onSuccess: (saved) => {
      toast.success(user ? 'User updated.' : 'User created.')
      queryClient.invalidateQueries({ queryKey: keys.resource('users') })
      // Instructors feed the section form's instructor picker.
      queryClient.invalidateQueries({ queryKey: keys.lookups.instructors })
      if (isSelf && me) setUser({ ...me, ...saved })
      onOpenChange(false)
    },
    onError: (error) => handleApiError(error, setError),
  })

  // Every exit route (X, Esc, outside click, Cancel) goes through requestClose; saving closes directly.
  const { requestClose, confirmProps } = useDiscardGuard(isDirty, () => onOpenChange(false))

  const roleOptions: Role[] = user?.role === 'student' ? ['student'] : STAFF_ROLES

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{user ? 'Edit user' : 'New user'}</DialogTitle>
            <DialogDescription>
              {user
                ? 'Leave the password blank to keep the current one.'
                : 'For administrator, registrar and instructor accounts. Student logins are created with the student.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="grid gap-4">
            <FormField id="name" label="Name" error={errors.name?.message}>
              <Input autoComplete="off" {...fieldProps('name', errors.name?.message)} {...register('name')} />
            </FormField>
            <FormField id="email" label="Email" error={errors.email?.message}>
              <Input
                type="email"
                autoComplete="off"
                {...fieldProps('email', errors.email?.message)}
                {...register('email')}
              />
            </FormField>
            <FormField
              id="password"
              label={user ? 'New password' : 'Password'}
              hint="At least 8 characters."
              error={errors.password?.message}
            >
              <Input
                type="password"
                autoComplete="new-password"
                {...fieldProps('password', errors.password?.message)}
                {...register('password')}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="role"
                label="Role"
                error={errors.role?.message}
                hint={isSelf ? 'You cannot change your own role.' : undefined}
              >
                <Controller
                  control={control}
                  name="role"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={roleLocked}>
                      <SelectTrigger {...fieldProps('role', errors.role?.message)}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField
                id="status"
                label="Status"
                error={errors.status?.message}
                hint={isSelf ? 'You cannot deactivate yourself.' : undefined}
              >
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange} disabled={isSelf}>
                      <SelectTrigger {...fieldProps('status', errors.status?.message)}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTIVE_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={requestClose} disabled={mutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog {...confirmProps} />
    </>
  )
}

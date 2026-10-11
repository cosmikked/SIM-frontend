import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FormField } from '@/components/FormField'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Textarea } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { programsApi } from '@/lib/api/endpoints/resources'
import { programSchema, type ProgramValues } from '@/lib/api/schemas'
import type { Program } from '@/lib/api/types'
import { handleApiError } from '@/lib/forms/applyApiErrors'
import { fieldProps } from '@/lib/forms/fieldProps'
import { useDiscardGuard } from '@/lib/forms/useDiscardGuard'
import { keys } from '@/lib/query/keys'

interface ProgramFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pass a program to edit it; omit to create. */
  program?: Program
}

const EMPTY: ProgramValues = { code: '', name: '', description: '', status: 'active' }

export function ProgramFormDialog({ open, onOpenChange, program }: ProgramFormDialogProps) {
  const queryClient = useQueryClient()
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<ProgramValues>({ resolver: zodResolver(programSchema), defaultValues: EMPTY })

  // Re-seed whenever the dialog opens (or switches between create and edit).
  useEffect(() => {
    if (open) {
      reset(
        program
          ? { code: program.code, name: program.name, description: program.description ?? '', status: program.status }
          : EMPTY,
      )
    }
  }, [open, program, reset])

  const mutation = useMutation({
    mutationFn: (values: ProgramValues) =>
      program ? programsApi.update(program.id, values) : programsApi.create(values),
    onSuccess: () => {
      toast.success(program ? 'Program updated.' : 'Program created.')
      queryClient.invalidateQueries({ queryKey: keys.resource('programs') })
      queryClient.invalidateQueries({ queryKey: keys.lookups.programs })
      onOpenChange(false)
    },
    onError: (error) => handleApiError(error, setError),
  })

  // Every exit route (X, Esc, outside click, Cancel) goes through requestClose; saving closes directly.
  const { requestClose, confirmProps } = useDiscardGuard(isDirty, () => onOpenChange(false))

  return (
    <>
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{program ? 'Edit program' : 'New program'}</DialogTitle>
          <DialogDescription>Programs group students and are required to create a student.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="grid gap-4">
          <FormField id="code" label="Code" error={errors.code?.message}>
            <Input className="font-mono" {...fieldProps('code', errors.code?.message)} {...register('code')} />
          </FormField>
          <FormField id="name" label="Name" error={errors.name?.message}>
            <Input {...fieldProps('name', errors.name?.message)} {...register('name')} />
          </FormField>
          <FormField id="description" label="Description" error={errors.description?.message}>
            <Textarea {...fieldProps('description', errors.description?.message)} {...register('description')} />
          </FormField>
          <FormField id="status" label="Status" error={errors.status?.message}>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger {...fieldProps('status', errors.status?.message)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
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

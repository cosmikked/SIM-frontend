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
import { academicTermsApi } from '@/lib/api/endpoints/resources'
import { academicTermSchema, type AcademicTermValues } from '@/lib/api/schemas'
import { TERM_NAMES, type AcademicTerm } from '@/lib/api/types'
import { toDateInput } from '@/lib/format'
import { handleApiError } from '@/lib/forms/applyApiErrors'
import { fieldProps } from '@/lib/forms/fieldProps'
import { useDiscardGuard } from '@/lib/forms/useDiscardGuard'
import { keys } from '@/lib/query/keys'

interface TermFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pass a term to edit it; omit to create. */
  term?: AcademicTerm
}

const EMPTY: AcademicTermValues = {
  academic_year: '',
  term: 'First Semester',
  start_date: '',
  end_date: '',
  status: 'active',
}

function toFormValues(term: AcademicTerm): AcademicTermValues {
  return {
    academic_year: term.academic_year,
    term: term.term,
    start_date: toDateInput(term.start_date),
    end_date: toDateInput(term.end_date),
    status: term.status,
  }
}

export function TermFormDialog({ open, onOpenChange, term }: TermFormDialogProps) {
  const queryClient = useQueryClient()
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<AcademicTermValues>({ resolver: zodResolver(academicTermSchema), defaultValues: EMPTY })

  useEffect(() => {
    if (open) reset(term ? toFormValues(term) : EMPTY)
  }, [open, term, reset])

  const mutation = useMutation({
    mutationFn: (values: AcademicTermValues) => {
      if (!term) return academicTermsApi.create(values)
      // The update request validates only what is sent against what is stored, so send the changes.
      const original = toFormValues(term)
      const changes = Object.fromEntries(
        Object.entries(values).filter(([key, value]) => value !== original[key as keyof AcademicTermValues]),
      )
      return academicTermsApi.update(term.id, changes)
    },
    onSuccess: () => {
      toast.success(term ? 'Term updated.' : 'Term created.')
      queryClient.invalidateQueries({ queryKey: keys.resource('academic-terms') })
      queryClient.invalidateQueries({ queryKey: keys.lookups.terms })
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
          <DialogTitle>{term ? 'Edit term' : 'New academic term'}</DialogTitle>
          <DialogDescription>
            Sections can only be created in an active term. Set grading deadlines after saving.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="academic_year" label="Academic year" error={errors.academic_year?.message} hint="e.g. 2024-2025">
              <Input
                className="tabular-nums"
                autoComplete="off"
                {...fieldProps('academic_year', errors.academic_year?.message)}
                {...register('academic_year')}
              />
            </FormField>
            <FormField id="term" label="Term" error={errors.term?.message}>
              <Controller
                control={control}
                name="term"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger {...fieldProps('term', errors.term?.message)}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TERM_NAMES.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="start_date" label="Start date" error={errors.start_date?.message}>
              <Input type="date" {...fieldProps('start_date', errors.start_date?.message)} {...register('start_date')} />
            </FormField>
            <FormField id="end_date" label="End date" error={errors.end_date?.message}>
              <Input type="date" {...fieldProps('end_date', errors.end_date?.message)} {...register('end_date')} />
            </FormField>
          </div>
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
              {mutation.isPending ? 'Saving…' : 'Save term'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <ConfirmDialog {...confirmProps} />
    </>
  )
}

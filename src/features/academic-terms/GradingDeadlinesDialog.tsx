import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FormField } from '@/components/FormField'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { academicTermsApi, type GradingDeadlinesBody } from '@/lib/api/endpoints/resources'
import { gradingDeadlinesSchema, type GradingDeadlinesValues } from '@/lib/api/schemas'
import type { AcademicTerm } from '@/lib/api/types'
import { isoToLocalInput, localInputToIso, toDateInput } from '@/lib/format'
import { handleApiError } from '@/lib/forms/applyApiErrors'
import { fieldProps } from '@/lib/forms/fieldProps'
import { useDiscardGuard } from '@/lib/forms/useDiscardGuard'
import { keys } from '@/lib/query/keys'

interface GradingDeadlinesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  term: AcademicTerm | null
}

const EMPTY: GradingDeadlinesValues = {
  midterm_grading_deadline: '',
  final_grading_deadline: '',
  inc_completion_deadline: '',
}

/**
 * PATCH /academic-terms/{id}/grading-deadlines. Each field is optional but cannot be sent
 * as null, so a blank field is left out and keeps its stored value.
 */
export function GradingDeadlinesDialog({ open, onOpenChange, term }: GradingDeadlinesDialogProps) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<GradingDeadlinesValues>({ resolver: zodResolver(gradingDeadlinesSchema), defaultValues: EMPTY })

  useEffect(() => {
    if (open && term) {
      reset({
        midterm_grading_deadline: isoToLocalInput(term.midterm_grading_deadline),
        final_grading_deadline: isoToLocalInput(term.final_grading_deadline),
        inc_completion_deadline: toDateInput(term.inc_completion_deadline),
      })
    }
  }, [open, term, reset])

  const mutation = useMutation({
    mutationFn: (values: GradingDeadlinesValues) => {
      const body: GradingDeadlinesBody = {}
      if (values.midterm_grading_deadline) body.midterm_grading_deadline = localInputToIso(values.midterm_grading_deadline)
      if (values.final_grading_deadline) body.final_grading_deadline = localInputToIso(values.final_grading_deadline)
      if (values.inc_completion_deadline) body.inc_completion_deadline = values.inc_completion_deadline
      return academicTermsApi.updateDeadlines(term!.id, body)
    },
    onSuccess: () => {
      toast.success('Grading deadlines saved.')
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
          <DialogTitle>Grading deadlines</DialogTitle>
          <DialogDescription>
            {term ? `${term.academic_year} ${term.term}. ` : ''}
            Instructors cannot save or publish grades after these dates. Administrators are exempt.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="grid gap-4">
          <FormField
            id="midterm_grading_deadline"
            label="Midterm grading deadline"
            error={errors.midterm_grading_deadline?.message}
          >
            <Input
              type="datetime-local"
              {...fieldProps('midterm_grading_deadline', errors.midterm_grading_deadline?.message)}
              {...register('midterm_grading_deadline')}
            />
          </FormField>
          <FormField
            id="final_grading_deadline"
            label="Final grading deadline"
            error={errors.final_grading_deadline?.message}
            hint="On or after the midterm deadline."
          >
            <Input
              type="datetime-local"
              {...fieldProps('final_grading_deadline', errors.final_grading_deadline?.message)}
              {...register('final_grading_deadline')}
            />
          </FormField>
          <FormField
            id="inc_completion_deadline"
            label="INC completion deadline"
            error={errors.inc_completion_deadline?.message}
            hint="On or after the final deadline. Unfinished INC grades fail after this date."
          >
            <Input
              type="date"
              {...fieldProps('inc_completion_deadline', errors.inc_completion_deadline?.message)}
              {...register('inc_completion_deadline')}
            />
          </FormField>
          <p className="type-caption">Blank fields keep their current value.</p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={requestClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save deadlines'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <ConfirmDialog {...confirmProps} />
    </>
  )
}

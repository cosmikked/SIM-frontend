import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FormField } from '@/components/FormField'
import { IdSelect } from '@/components/IdSelect'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { courseOfferingsApi, enrollmentsApi } from '@/lib/api/endpoints/resources'
import { enrollmentSchema, type EnrollmentValues } from '@/lib/api/schemas'
import type { Student } from '@/lib/api/types'
import { termLabel, toDateInput } from '@/lib/format'
import { handleApiError } from '@/lib/forms/applyApiErrors'
import { fieldProps } from '@/lib/forms/fieldProps'
import { useDiscardGuard } from '@/lib/forms/useDiscardGuard'
import { keys } from '@/lib/query/keys'
import { useLookups } from '@/lib/query/useLookups'

import { StudentPicker } from './StudentPicker'

interface EnrollmentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-fill (and lock) the student, e.g. when opened from a student's page. */
  student?: Student
}

/** Local calendar date as YYYY-MM-DD (toISOString would shift it into UTC). */
function today(): string {
  return new Date().toLocaleDateString('en-CA')
}

export function EnrollmentFormDialog({ open, onOpenChange, student: presetStudent }: EnrollmentFormDialogProps) {
  const queryClient = useQueryClient()
  const lookups = useLookups({ courses: true, terms: true })
  // The student chosen in the picker; a preset (from a student's page) takes precedence and is locked.
  const [picked, setPicked] = useState<Student | null>(null)
  const student = presetStudent ?? picked

  function close() {
    setPicked(null)
    onOpenChange(false)
  }

  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    setValue,
    getValues,
    formState: { errors, isDirty },
  } = useForm<EnrollmentValues>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: { student_id: 0, course_offering_id: 0, enrollment_date: today() },
  })

  useEffect(() => {
    if (open) {
      reset({ student_id: presetStudent?.id ?? 0, course_offering_id: 0, enrollment_date: today() })
    }
  }, [open, presetStudent, reset])

  // Only open sections can take enrollments (the server rejects anything else with a 422).
  const offerings = useQuery({
    queryKey: keys.list('course-offerings', { enrollable: true }),
    queryFn: () => courseOfferingsApi.list({ status: 'open', per_page: 100, sort: 'section' }),
    enabled: open,
  })
  const offeringOptions = (offerings.data?.items ?? []).map((o) => {
    const course = lookups.courses.get(o.course_id)
    const term = lookups.terms.get(o.academic_term_id)
    return {
      id: o.id,
      label: `${course?.course_code ?? `#${o.course_id}`} ${o.section}${term ? ` · ${termLabel(term)}` : ''}`,
    }
  })

  const offeringId = useWatch({ control, name: 'course_offering_id' })
  const offering = offerings.data?.items.find((o) => o.id === offeringId)
  const termStart = offering ? toDateInput(lookups.terms.get(offering.academic_term_id)?.start_date) : undefined

  // The offering resource has no seats-taken field; only `enrolled` students use a seat.
  const seats = useQuery({
    queryKey: [...keys.resource('enrollments'), 'seats', offeringId],
    queryFn: () => courseOfferingsApi.roster(offeringId, { status: 'enrolled', per_page: 1 }),
    enabled: open && offeringId > 0,
  })
  const taken = seats.data?.meta.total
  const isFull = offering !== undefined && taken !== undefined && taken >= offering.capacity

  const mutation = useMutation({
    mutationFn: (values: EnrollmentValues) => enrollmentsApi.create(values),
    onSuccess: () => {
      toast.success('Student enrolled.')
      queryClient.invalidateQueries({ queryKey: keys.resource('enrollments') })
      close()
    },
    // 422s land on the field: duplicate, full, not open (course_offering_id), date before term start.
    onError: (error) => handleApiError(error, setError),
  })

  // Every exit route (X, Esc, outside click, Cancel) goes through requestClose; saving closes directly.
  const { requestClose, confirmProps } = useDiscardGuard(isDirty, close)

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enroll student</DialogTitle>
            <DialogDescription>
              Choose the student and an open section with a free seat. Students cannot enroll themselves.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="grid gap-4">
            <FormField id="student_id" label="Student" error={errors.student_id?.message}>
              <Controller
                control={control}
                name="student_id"
                render={({ field }) => (
                  <StudentPicker
                    id="student_id"
                    value={student}
                    disabled={presetStudent !== undefined}
                    invalid={!!errors.student_id}
                    aria-describedby={errors.student_id ? 'student_id-error' : undefined}
                    onChange={(next) => {
                      setPicked(next)
                      field.onChange(next?.id ?? 0)
                      clearErrors(['student_id', 'course_offering_id'])
                    }}
                  />
                )}
              />
            </FormField>

            <FormField id="course_offering_id" label="Section" error={errors.course_offering_id?.message}>
              <Controller
                control={control}
                name="course_offering_id"
                render={({ field }) => (
                  <IdSelect
                    id="course_offering_id"
                    value={field.value}
                    options={offeringOptions}
                    placeholder={offerings.isLoading ? 'Loading sections…' : 'Choose an open section'}
                    invalid={!!errors.course_offering_id}
                    aria-describedby={errors.course_offering_id ? 'course_offering_id-error' : undefined}
                    onChange={(id) => {
                      field.onChange(id)
                      clearErrors(['student_id', 'course_offering_id', 'enrollment_date'])
                      // Keep the date valid for the new term instead of waiting for a 422.
                      const start = toDateInput(
                        lookups.terms.get(offerings.data?.items.find((o) => o.id === id)?.academic_term_id ?? 0)
                          ?.start_date,
                      )
                      if (start && getValues('enrollment_date') < start) {
                        setValue('enrollment_date', start, { shouldDirty: true })
                      }
                    }}
                  />
                )}
              />
            </FormField>

            {offering && taken !== undefined && (
              isFull ? (
                <Alert tone="warning">
                  <AlertDescription>
                    {taken} of {offering.capacity} seats taken. This section is full, so choose another section of the
                    course.
                  </AlertDescription>
                </Alert>
              ) : (
                <p className="type-caption">
                  {taken} of {offering.capacity} seats taken.
                </p>
              )
            )}

            <FormField
              id="enrollment_date"
              label="Enrollment date"
              error={errors.enrollment_date?.message}
              hint={termStart ? 'On or after the term start.' : undefined}
            >
              <Input
                type="date"
                min={termStart || undefined}
                {...fieldProps('enrollment_date', errors.enrollment_date?.message)}
                {...register('enrollment_date')}
              />
            </FormField>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={requestClose} disabled={mutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending || isFull}>
                {mutation.isPending ? 'Enrolling…' : 'Enroll student'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog {...confirmProps} />
    </>
  )
}

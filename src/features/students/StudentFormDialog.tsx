import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FormField } from '@/components/FormField'
import { IdSelect } from '@/components/IdSelect'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input, Textarea } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { studentsApi } from '@/lib/api/endpoints/resources'
import { studentSchema, toStudentBody, type StudentValues } from '@/lib/api/schemas'
import { STUDENT_STATUSES, YEAR_LEVELS, type Student } from '@/lib/api/types'
import { toDateInput } from '@/lib/format'
import { handleApiError } from '@/lib/forms/applyApiErrors'
import { fieldProps } from '@/lib/forms/fieldProps'
import { useDiscardGuard } from '@/lib/forms/useDiscardGuard'
import { keys } from '@/lib/query/keys'
import { useLookups } from '@/lib/query/useLookups'

interface StudentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pass a student to edit them; omit to create. */
  student?: Student
}

const EMPTY: StudentValues = {
  student_number: '',
  first_name: '',
  middle_name: '',
  last_name: '',
  suffix: '',
  birth_date: '',
  email: '',
  contact_number: '',
  address: '',
  program_id: 0,
  year_level: 1,
  status: 'regular',
}

function toFormValues(student: Student): StudentValues {
  return {
    student_number: student.student_number,
    first_name: student.first_name,
    middle_name: student.middle_name ?? '',
    last_name: student.last_name,
    suffix: student.suffix ?? '',
    birth_date: toDateInput(student.birth_date),
    email: student.email,
    contact_number: student.contact_number ?? '',
    address: student.address ?? '',
    program_id: student.program_id,
    year_level: student.year_level,
    status: student.status,
  }
}

export function StudentFormDialog({ open, onOpenChange, student }: StudentFormDialogProps) {
  const queryClient = useQueryClient()
  const lookups = useLookups({ programs: true })
  const programOptions = [...lookups.programs.values()].map((p) => ({ id: p.id, label: `${p.code} · ${p.name}` }))

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<StudentValues>({ resolver: zodResolver(studentSchema), defaultValues: EMPTY })

  // Re-seed whenever the dialog opens (or switches between create and edit).
  useEffect(() => {
    if (open) reset(student ? toFormValues(student) : EMPTY)
  }, [open, student, reset])

  const mutation = useMutation({
    mutationFn: (values: StudentValues) =>
      student ? studentsApi.update(student.id, toStudentBody(values)) : studentsApi.create(toStudentBody(values)),
    onSuccess: () => {
      if (student) {
        toast.success('Student updated.')
      } else {
        // The account is created with a default dev password (PRD 5.6 / 6.2).
        toast.success('Student created.', {
          description: 'They sign in by using "Forgot password" to set their own password.',
        })
      }
      queryClient.invalidateQueries({ queryKey: keys.resource('students') })
      onOpenChange(false)
    },
    onError: (error) => handleApiError(error, setError),
  })

  // Every exit route (X, Esc, outside click, Cancel) goes through requestClose; saving closes directly.
  const { requestClose, confirmProps } = useDiscardGuard(isDirty, () => onOpenChange(false))

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{student ? 'Edit student' : 'New student'}</DialogTitle>
            <DialogDescription>
              {student
                ? 'Changing the email also updates the student’s login.'
                : 'This also creates the student’s login account, using the email below.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="student_number" label="Student number" error={errors.student_number?.message}>
                <Input
                  className="font-mono"
                  autoComplete="off"
                  {...fieldProps('student_number', errors.student_number?.message)}
                  {...register('student_number')}
                />
              </FormField>
              <FormField id="email" label="Email" error={errors.email?.message}>
                <Input
                  type="email"
                  autoComplete="off"
                  {...fieldProps('email', errors.email?.message)}
                  {...register('email')}
                />
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr_6rem]">
              <FormField id="first_name" label="First name" error={errors.first_name?.message}>
                <Input {...fieldProps('first_name', errors.first_name?.message)} {...register('first_name')} />
              </FormField>
              <FormField id="middle_name" label="Middle name" error={errors.middle_name?.message}>
                <Input {...fieldProps('middle_name', errors.middle_name?.message)} {...register('middle_name')} />
              </FormField>
              <FormField id="last_name" label="Last name" error={errors.last_name?.message}>
                <Input {...fieldProps('last_name', errors.last_name?.message)} {...register('last_name')} />
              </FormField>
              <FormField id="suffix" label="Suffix" error={errors.suffix?.message}>
                <Input {...fieldProps('suffix', errors.suffix?.message)} {...register('suffix')} />
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="birth_date" label="Birth date" error={errors.birth_date?.message}>
                <Input type="date" {...fieldProps('birth_date', errors.birth_date?.message)} {...register('birth_date')} />
              </FormField>
              <FormField id="contact_number" label="Contact number" error={errors.contact_number?.message}>
                <Input
                  type="tel"
                  autoComplete="off"
                  {...fieldProps('contact_number', errors.contact_number?.message)}
                  {...register('contact_number')}
                />
              </FormField>
            </div>

            <FormField id="address" label="Address" error={errors.address?.message}>
              <Textarea {...fieldProps('address', errors.address?.message)} {...register('address')} />
            </FormField>

            <FormField id="program_id" label="Program" error={errors.program_id?.message}>
              <Controller
                control={control}
                name="program_id"
                render={({ field }) => (
                  <IdSelect
                    id="program_id"
                    value={field.value}
                    onChange={field.onChange}
                    options={programOptions}
                    placeholder="Choose a program"
                    invalid={!!errors.program_id}
                    aria-describedby={errors.program_id ? 'program_id-error' : undefined}
                  />
                )}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="year_level" label="Year level" error={errors.year_level?.message}>
                <Controller
                  control={control}
                  name="year_level"
                  render={({ field }) => (
                    <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                      <SelectTrigger {...fieldProps('year_level', errors.year_level?.message)}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {YEAR_LEVELS.map((level) => (
                          <SelectItem key={level} value={String(level)}>
                            Year {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
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
                        {STUDENT_STATUSES.map((s) => (
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

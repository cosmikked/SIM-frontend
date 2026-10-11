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
import { coursesApi } from '@/lib/api/endpoints/resources'
import { courseSchema, type CourseValues } from '@/lib/api/schemas'
import type { Course } from '@/lib/api/types'
import { handleApiError } from '@/lib/forms/applyApiErrors'
import { fieldProps } from '@/lib/forms/fieldProps'
import { useDiscardGuard } from '@/lib/forms/useDiscardGuard'
import { keys } from '@/lib/query/keys'

interface CourseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pass a course to edit it; omit to create. */
  course?: Course
}

const EMPTY: CourseValues = { course_code: '', course_title: '', description: '', units: 3, status: 'active' }

export function CourseFormDialog({ open, onOpenChange, course }: CourseFormDialogProps) {
  const queryClient = useQueryClient()
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<CourseValues>({ resolver: zodResolver(courseSchema), defaultValues: EMPTY })

  useEffect(() => {
    if (open) {
      reset(
        course
          ? {
              course_code: course.course_code,
              course_title: course.course_title,
              description: course.description ?? '',
              units: course.units,
              status: course.status,
            }
          : EMPTY,
      )
    }
  }, [open, course, reset])

  const mutation = useMutation({
    mutationFn: (values: CourseValues) => (course ? coursesApi.update(course.id, values) : coursesApi.create(values)),
    onSuccess: () => {
      toast.success(course ? 'Course updated.' : 'Course created.')
      queryClient.invalidateQueries({ queryKey: keys.resource('courses') })
      queryClient.invalidateQueries({ queryKey: keys.lookups.courses })
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
          <DialogTitle>{course ? 'Edit course' : 'New course'}</DialogTitle>
          <DialogDescription>Courses are the catalog entries that sections are created from.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
            <FormField id="course_code" label="Course code" error={errors.course_code?.message}>
              <Input
                className="font-mono"
                {...fieldProps('course_code', errors.course_code?.message)}
                {...register('course_code')}
              />
            </FormField>
            <FormField id="units" label="Units" error={errors.units?.message}>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={9}
                className="tabular-nums"
                {...fieldProps('units', errors.units?.message)}
                {...register('units', { valueAsNumber: true })}
              />
            </FormField>
          </div>
          <FormField id="course_title" label="Course title" error={errors.course_title?.message}>
            <Input {...fieldProps('course_title', errors.course_title?.message)} {...register('course_title')} />
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
              {mutation.isPending ? 'Saving…' : 'Save course'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <ConfirmDialog {...confirmProps} />
    </>
  )
}

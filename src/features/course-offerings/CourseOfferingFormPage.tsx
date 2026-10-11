import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FormField } from '@/components/FormField'
import { IdSelect, type IdOption } from '@/components/IdSelect'
import { PageHeader } from '@/components/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api/client'
import { courseOfferingsApi } from '@/lib/api/endpoints/resources'
import { courseOfferingSchema, type CourseOfferingValues } from '@/lib/api/schemas'
import {
  OFFERING_STATUSES,
  type CourseOffering,
  type CourseOfferingInput,
  type DayOfWeek,
} from '@/lib/api/types'
import { fromApiTime, termLabel, toApiTime } from '@/lib/format'
import { handleApiError } from '@/lib/forms/applyApiErrors'
import { fieldProps } from '@/lib/forms/fieldProps'
import { useLeaveGuard } from '@/lib/forms/useDiscardGuard'
import { keys } from '@/lib/query/keys'
import { useLookups } from '@/lib/query/useLookups'

import { ScheduleRows } from './ScheduleRows'

const EMPTY: CourseOfferingValues = {
  course_id: 0,
  academic_term_id: 0,
  instructor_id: 0,
  section: '',
  capacity: 40,
  status: 'open',
  schedules: [{ room_id: 0, day_of_week: 'Monday', start_time: '', end_time: '' }],
}

function toFormValues(offering: CourseOffering): CourseOfferingValues {
  return {
    course_id: offering.course_id,
    academic_term_id: offering.academic_term_id,
    instructor_id: offering.instructor_id ?? 0,
    section: offering.section,
    capacity: offering.capacity,
    status: offering.status,
    schedules: offering.schedules.map((s) => ({
      room_id: s.room_id,
      day_of_week: s.day_of_week as DayOfWeek,
      start_time: fromApiTime(s.start_time),
      end_time: fromApiTime(s.end_time),
    })),
  }
}

function toBody(values: CourseOfferingValues, editing: boolean): CourseOfferingInput {
  const body: CourseOfferingInput = {
    instructor_id: values.instructor_id,
    section: values.section,
    capacity: values.capacity,
    status: values.status,
    schedules: values.schedules.map((s) => ({
      room_id: s.room_id,
      day_of_week: s.day_of_week,
      start_time: toApiTime(s.start_time),
      end_time: toApiTime(s.end_time),
    })),
  }
  // course_id and academic_term_id cannot change after creation (FR-OFF-4).
  return editing ? body : { course_id: values.course_id, academic_term_id: values.academic_term_id, ...body }
}

/** Create (`/course-offerings/new`) and edit (`/course-offerings/:id/edit`) a section with its schedule. */
export function CourseOfferingFormPage() {
  const { id } = useParams()
  const offeringId = id ? Number(id) : undefined
  const editing = offeringId !== undefined
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const lookups = useLookups({ terms: true, courses: true, rooms: true, instructors: true })

  const offeringQuery = useQuery({
    queryKey: keys.detail('course-offerings', offeringId ?? 0),
    queryFn: () => courseOfferingsApi.get(offeringId!),
    enabled: editing,
  })
  const offering = offeringQuery.data

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<CourseOfferingValues>({ resolver: zodResolver(courseOfferingSchema), defaultValues: EMPTY })

  // Blocks the back link, sidebar links and browser back while there are unsaved edits.
  const { confirmProps, skipOnce } = useLeaveGuard(isDirty)

  // Seed once: from the loaded offering, or from ?academic_term_id= when arriving from the terms list.
  const presetTerm = Number(searchParams.get('academic_term_id')) || 0
  useEffect(() => {
    if (offering) reset(toFormValues(offering))
  }, [offering, reset])
  useEffect(() => {
    if (!editing && presetTerm) reset({ ...EMPTY, academic_term_id: presetTerm })
  }, [editing, presetTerm, reset])

  const mutation = useMutation({
    mutationFn: (values: CourseOfferingValues) => {
      const body = toBody(values, editing)
      return editing ? courseOfferingsApi.update(offeringId, body) : courseOfferingsApi.create(body)
    },
    onSuccess: () => {
      toast.success(editing ? 'Section updated.' : 'Section created.')
      queryClient.invalidateQueries({ queryKey: keys.resource('course-offerings') })
      queryClient.invalidateQueries({ queryKey: keys.lookups.offerings })
      skipOnce()
      navigate('/course-offerings')
    },
    onError: (error) => handleApiError(error, setError),
  })

  // New sections go in active terms and active courses/instructors; keep the current value of an existing one.
  const termOptions: IdOption[] = useMemo(
    () => [...lookups.terms.values()].filter((t) => t.status === 'active').map((t) => ({ id: t.id, label: termLabel(t) })),
    [lookups.terms],
  )
  const courseOptions: IdOption[] = useMemo(
    () =>
      [...lookups.courses.values()]
        .filter((c) => c.status === 'active')
        .map((c) => ({ id: c.id, label: `${c.course_code} · ${c.course_title}` })),
    [lookups.courses],
  )
  const instructorOptions: IdOption[] = useMemo(
    () =>
      [...lookups.instructors.values()]
        .filter((i) => i.status === 'active' || i.id === offering?.instructor_id)
        .map((i) => ({ id: i.id, label: i.name })),
    [lookups.instructors, offering?.instructor_id],
  )
  const roomOptions: IdOption[] = useMemo(
    () =>
      [...lookups.rooms.values()].map((r) => ({
        id: r.id,
        label: `${r.code} · ${r.building} (${r.capacity} seats)`,
      })),
    [lookups.rooms],
  )

  const notFound = offeringQuery.error instanceof ApiError && offeringQuery.error.status === 404
  const noActiveTerm = !editing && !lookups.isLoading && termOptions.length === 0

  const title = editing ? 'Edit section' : 'New section'
  const header = (
    <>
      <Button asChild variant="link" className="mb-2 -ml-2 h-auto px-2 py-1 text-ink-secondary">
        <Link to="/course-offerings">
          <ArrowLeft /> Course offerings
        </Link>
      </Button>
      <PageHeader
        title={title}
        description={
          editing
            ? 'Change the instructor, capacity or meeting times. The course and term are fixed.'
            : 'A section is one class of a course in a term, with its instructor and meeting times.'
        }
      />
    </>
  )

  if (editing && (offeringQuery.isLoading || notFound || offeringQuery.isError)) {
    return (
      <>
        {header}
        {offeringQuery.isLoading ? (
          <div className="grid max-w-3xl gap-3">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        ) : (
          <Alert tone="error" className="max-w-3xl">
            <AlertTitle>{notFound ? 'Section not found' : 'Could not load this section'}</AlertTitle>
            <AlertDescription>
              {notFound ? 'It may have been deleted.' : 'Something went wrong while fetching it.'}{' '}
              <Link to="/course-offerings" className="font-semibold underline">
                Back to course offerings
              </Link>
            </AlertDescription>
          </Alert>
        )}
      </>
    )
  }

  if (noActiveTerm) {
    return (
      <>
        {header}
        <Alert tone="warning" className="max-w-3xl">
          <AlertTitle>No active academic term</AlertTitle>
          <AlertDescription>
            Sections can only be created in an active term.{' '}
            <Link to="/academic-terms" className="font-semibold underline">
              Create or activate a term first
            </Link>
            .
          </AlertDescription>
        </Alert>
      </>
    )
  }

  const course = offering ? lookups.courses.get(offering.course_id) : undefined
  const term = offering ? lookups.terms.get(offering.academic_term_id) : undefined

  return (
    <>
      {header}
      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        noValidate
        className="grid max-w-3xl gap-6"
      >
        <section aria-labelledby="section-heading" className="grid gap-4 rounded-lg border bg-card p-5">
          <h2 id="section-heading" className="type-section">
            Section
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {editing ? (
              <>
                <ReadOnlyField
                  label="Course"
                  value={course ? `${course.course_code} · ${course.course_title}` : '—'}
                />
                <ReadOnlyField label="Term" value={term ? termLabel(term) : '—'} />
                <p className="type-caption sm:col-span-2">
                  The course and term cannot be changed. To move a section, delete it and create a new one.
                </p>
              </>
            ) : (
              <>
                <FormField id="course_id" label="Course" error={errors.course_id?.message}>
                  <Controller
                    control={control}
                    name="course_id"
                    render={({ field }) => (
                      <IdSelect
                        {...fieldProps('course_id', errors.course_id?.message)}
                        invalid={!!errors.course_id}
                        value={field.value}
                        onChange={field.onChange}
                        options={courseOptions}
                        placeholder="Choose a course"
                      />
                    )}
                  />
                </FormField>
                <FormField
                  id="academic_term_id"
                  label="Term"
                  error={errors.academic_term_id?.message}
                  hint="Only active terms are listed."
                >
                  <Controller
                    control={control}
                    name="academic_term_id"
                    render={({ field }) => (
                      <IdSelect
                        {...fieldProps('academic_term_id', errors.academic_term_id?.message)}
                        invalid={!!errors.academic_term_id}
                        value={field.value}
                        onChange={field.onChange}
                        options={termOptions}
                        placeholder="Choose a term"
                      />
                    )}
                  />
                </FormField>
              </>
            )}

            <FormField id="section" label="Section" error={errors.section?.message} hint="Unique within the course and term, e.g. A1.">
              <Input
                className="font-mono"
                autoComplete="off"
                {...fieldProps('section', errors.section?.message)}
                {...register('section')}
              />
            </FormField>
            <FormField id="instructor_id" label="Instructor" error={errors.instructor_id?.message}>
              <Controller
                control={control}
                name="instructor_id"
                render={({ field }) => (
                  <IdSelect
                    {...fieldProps('instructor_id', errors.instructor_id?.message)}
                    invalid={!!errors.instructor_id}
                    value={field.value}
                    onChange={field.onChange}
                    options={instructorOptions}
                    placeholder="Choose an instructor"
                  />
                )}
              />
            </FormField>
            <FormField id="capacity" label="Seats" error={errors.capacity?.message}>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                className="tabular-nums"
                {...fieldProps('capacity', errors.capacity?.message)}
                {...register('capacity', { valueAsNumber: true })}
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
                      {OFFERING_STATUSES.map((s) => (
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
        </section>

        <section aria-labelledby="schedule-heading" className="grid gap-4 rounded-lg border bg-card p-5">
          <div className="flex flex-col gap-1">
            <h2 id="schedule-heading" className="type-section">
              Meeting times
            </h2>
            <p className="type-caption">
              A room and the instructor cannot be in two places at once: overlapping times in the same term are rejected.
            </p>
          </div>
          <ScheduleRows control={control} errors={errors} register={register} rooms={roomOptions} />
        </section>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => navigate('/course-offerings')} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : editing ? 'Save changes' : 'Create section'}
          </Button>
        </div>
      </form>

      <ConfirmDialog {...confirmProps} />
    </>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="type-label">{label}</span>
      <p className="flex h-9 items-center rounded-md border border-border-subtle bg-canvas px-3 text-sm text-ink-secondary">
        {value}
      </p>
    </div>
  )
}

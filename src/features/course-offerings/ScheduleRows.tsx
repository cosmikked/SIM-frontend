import { Plus, Trash2 } from 'lucide-react'
import { Controller, useFieldArray, type Control, type FieldErrors, type UseFormRegister } from 'react-hook-form'

import { IdSelect, type IdOption } from '@/components/IdSelect'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { CourseOfferingValues } from '@/lib/api/schemas'
import { DAYS_OF_WEEK } from '@/lib/api/types'
import { fieldProps } from '@/lib/forms/fieldProps'
import { cn } from '@/lib/utils'

interface ScheduleRowsProps {
  control: Control<CourseOfferingValues>
  errors: FieldErrors<CourseOfferingValues>
  register: UseFormRegister<CourseOfferingValues>
  rooms: IdOption[]
}

const EMPTY_ROW = { room_id: 0, day_of_week: 'Monday', start_time: '', end_time: '' } as const

/**
 * The repeating "room, day, start, end" rows of a section. Labels are visible on the first
 * row (and on every row on small screens, where the row stacks) and screen-reader-only after.
 */
export function ScheduleRows({ control, errors, register, rooms }: ScheduleRowsProps) {
  const { fields, append, remove } = useFieldArray({ control, name: 'schedules' })

  // Conflicts with other sections (room or instructor) arrive as one 422 on `schedules`.
  const rootMessage = errors.schedules?.root?.message ?? errors.schedules?.message

  const labelClass = (index: number) => cn(index > 0 && 'sm:sr-only')

  return (
    <div className="grid gap-4">
      {rootMessage && (
        <Alert tone="error">
          <AlertTitle>This schedule cannot be saved</AlertTitle>
          <AlertDescription>{rootMessage}</AlertDescription>
        </Alert>
      )}

      <ul className="grid gap-4">
        {fields.map((field, index) => {
          const rowErrors = errors.schedules?.[index]
          const n = index + 1
          return (
            <li
              key={field.id}
              className="grid gap-3 border-b border-border-subtle pb-4 last:border-b-0 last:pb-0 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_auto] sm:items-start sm:border-b-0 sm:pb-0"
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`schedules-${index}-room`} className={labelClass(index)}>
                  Room<span className="sr-only"> for schedule {n}</span>
                </Label>
                <Controller
                  control={control}
                  name={`schedules.${index}.room_id`}
                  render={({ field: f }) => (
                    <IdSelect
                      {...fieldProps(`schedules-${index}-room`, rowErrors?.room_id?.message)}
                      invalid={!!rowErrors?.room_id}
                      value={f.value}
                      onChange={f.onChange}
                      options={rooms}
                      placeholder="Choose a room"
                    />
                  )}
                />
                <FieldError id={`schedules-${index}-room`} message={rowErrors?.room_id?.message} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`schedules-${index}-day`} className={labelClass(index)}>
                  Day<span className="sr-only"> for schedule {n}</span>
                </Label>
                <Controller
                  control={control}
                  name={`schedules.${index}.day_of_week`}
                  render={({ field: f }) => (
                    <Select value={f.value} onValueChange={f.onChange}>
                      <SelectTrigger {...fieldProps(`schedules-${index}-day`, rowErrors?.day_of_week?.message)}>
                        <SelectValue placeholder="Choose a day" />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day) => (
                          <SelectItem key={day} value={day}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError id={`schedules-${index}-day`} message={rowErrors?.day_of_week?.message} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`schedules-${index}-start`} className={labelClass(index)}>
                  Starts<span className="sr-only"> for schedule {n}</span>
                </Label>
                <Input
                  type="time"
                  className="tabular-nums"
                  {...fieldProps(`schedules-${index}-start`, rowErrors?.start_time?.message)}
                  {...register(`schedules.${index}.start_time`)}
                />
                <FieldError id={`schedules-${index}-start`} message={rowErrors?.start_time?.message} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`schedules-${index}-end`} className={labelClass(index)}>
                  Ends<span className="sr-only"> for schedule {n}</span>
                </Label>
                <Input
                  type="time"
                  className="tabular-nums"
                  {...fieldProps(`schedules-${index}-end`, rowErrors?.end_time?.message)}
                  {...register(`schedules.${index}.end_time`)}
                />
                <FieldError id={`schedules-${index}-end`} message={rowErrors?.end_time?.message} />
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn('justify-self-start sm:justify-self-end', index === 0 && 'sm:mt-[1.625rem]')}
                aria-label={`Remove schedule ${n}`}
                disabled={fields.length === 1}
                onClick={() => remove(index)}
              >
                <Trash2 />
              </Button>
            </li>
          )
        })}
      </ul>

      <div>
        <Button type="button" variant="outline" size="sm" onClick={() => append({ ...EMPTY_ROW })}>
          <Plus /> Add a meeting time
        </Button>
      </div>
    </div>
  )
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={`${id}-error`} className="text-[0.8125rem] text-error-fg" role="alert">
      {message}
    </p>
  )
}

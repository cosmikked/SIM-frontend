import type { Room, Schedule } from '@/lib/api/types'

/** `<input type="time">` gives HH:MM; the API wants HH:MM:SS. */
export function toApiTime(time: string): string {
  return time.length === 5 ? `${time}:00` : time
}

/** HH:MM:SS from the API to HH:MM for `<input type="time">`. */
export function fromApiTime(time: string): string {
  return time.slice(0, 5)
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** ISO timestamp from the API to the local value `<input type="datetime-local">` expects. */
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Local `datetime-local` value back to an ISO timestamp (UTC) for the API. */
export function localInputToIso(value: string): string {
  return new Date(value).toISOString()
}

/** `YYYY-MM-DD` (or the date part of an ISO timestamp) for `<input type="date">`. */
export function toDateInput(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : ''
}

const dateFormat = new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
const dateTimeFormat = new Intl.DateTimeFormat('en-PH', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

/** Date-only strings are parsed as local dates so they never shift a day across time zones. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  return dateFormat.format(new Date(y, m - 1, d))
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : dateTimeFormat.format(d)
}

/** "Mon 09:00–10:30 · R101" */
export function scheduleSummary(schedule: Schedule, room?: Room): string {
  const day = schedule.day_of_week.slice(0, 3)
  const time = `${fromApiTime(schedule.start_time)}–${fromApiTime(schedule.end_time)}`
  return room ? `${day} ${time} · ${room.code}` : `${day} ${time}`
}

/** "Dela Cruz, Juan M. Jr." */
export function studentName(s: {
  first_name: string
  middle_name: string | null
  last_name: string
  suffix: string | null
}): string {
  const given = [s.first_name, s.middle_name ? `${s.middle_name.charAt(0)}.` : null, s.suffix].filter(Boolean).join(' ')
  return `${s.last_name}, ${given}`
}

/** "2024-2025 First Semester" */
export function termLabel(term: { academic_year: string; term: string }): string {
  return `${term.academic_year} ${term.term}`
}

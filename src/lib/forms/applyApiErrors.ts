import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { toast } from 'sonner'

import { ApiError } from '@/lib/api/client'

/**
 * Standard handling for a failed mutation (PRD section 8):
 *  - 422: map `errors[field]` onto the form fields; fall back to a toast if nothing matched
 *  - 403 / 409: show the server `message` as a toast
 *  - 429: ask the user to wait
 *  - anything else: generic message
 * Returns true when the error was a field-level validation error.
 */
export function handleApiError<T extends FieldValues>(error: unknown, setError?: UseFormSetError<T>): boolean {
  if (!(error instanceof ApiError)) {
    toast.error('Something went wrong. Please try again.')
    return false
  }

  switch (error.status) {
    case 422: {
      let mapped = 0
      if (setError) {
        for (const [field, messages] of Object.entries(error.errors)) {
          setError(field as Path<T>, { type: 'server', message: messages[0] })
          mapped++
        }
      }
      if (mapped === 0) toast.error(error.message)
      return mapped > 0
    }
    case 403:
    case 409:
      toast.error(error.message)
      return false
    case 429:
      toast.error('Too many requests. Please wait a moment and try again.')
      return false
    case 0:
      toast.error(error.message)
      return false
    default:
      toast.error(error.status >= 500 ? 'Something went wrong on the server. Please try again.' : error.message)
      return false
  }
}

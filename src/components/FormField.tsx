import type { ReactNode } from 'react'

import { Label } from '@/components/ui/label'

interface FormFieldProps {
  id: string
  label: string
  error?: string
  hint?: string
  children: ReactNode
}

/** Label + control + inline error. Pass `aria-invalid` / `aria-describedby` on the control yourself via `fieldProps`. */
export function FormField({ id, label, error, hint, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && <p className="type-caption">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="text-[0.8125rem] text-error-fg" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

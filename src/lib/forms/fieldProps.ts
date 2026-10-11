/** aria wiring for a control inside <FormField>: marks it invalid and points at the error message. */
export function fieldProps(id: string, error?: string) {
  return { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? `${id}-error` : undefined }
}

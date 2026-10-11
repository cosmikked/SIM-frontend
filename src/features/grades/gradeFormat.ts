/** A score or equivalent grade for display; "—" when there is none. */
export function score(value: number | null | undefined, digits = 2): string {
  return value === null || value === undefined ? '—' : value.toFixed(digits)
}

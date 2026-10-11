/** Badge tone for a grade `remarks` value (Passed, Failed, Conditional, Incomplete, Withdrawn, Ongoing). */
export function remarksTone(remarks: string): 'success' | 'warning' | 'error' | 'neutral' {
  switch (remarks) {
    case 'Passed':
      return 'success'
    case 'Failed':
      return 'error'
    case 'Conditional':
    case 'Incomplete':
      return 'warning'
    default:
      return 'neutral'
  }
}

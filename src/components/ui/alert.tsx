import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

const alertVariants = cva('flex flex-col gap-1 rounded-md border px-4 py-3 text-sm', {
  variants: {
    tone: {
      warning: 'border-warning-border bg-warning-bg text-warning-banner',
      error: 'border-error-border bg-error-bg text-error-banner',
      success: 'border-tint-border bg-success-bg text-success-fg',
      neutral: 'border-border bg-neutral-bg text-neutral-fg',
    },
  },
  defaultVariants: { tone: 'neutral' },
})

export function Alert({
  className,
  tone,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return <div role="alert" className={cn(alertVariants({ tone }), className)} {...props} />
}

export function AlertTitle({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('font-semibold', className)} {...props} />
}

export function AlertDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('leading-normal', className)} {...props} />
}

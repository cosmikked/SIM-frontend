import { useCallback, useEffect, useRef, useState, type ComponentProps } from 'react'
import { useBlocker } from 'react-router'

import type { ConfirmDialog } from '@/components/ConfirmDialog'

type ConfirmProps = ComponentProps<typeof ConfirmDialog>

/** Same wording everywhere a form can be abandoned. Render with `<ConfirmDialog {...confirmProps} />`. */
const DISCARD_COPY = {
  title: 'Discard changes?',
  description: 'You have unsaved changes. If you leave now, they will be lost.',
  confirmLabel: 'Discard',
  cancelLabel: 'Keep editing',
  destructive: true,
} as const

/**
 * For form dialogs. Route every way out through `requestClose`: pass it to the Dialog's
 * `onOpenChange(false)` (Radix sends the X button, Esc and outside clicks there) and to the
 * Cancel button. A pristine form closes at once; a dirty one asks first.
 *
 * Call the real `close` directly after a successful save, so a saved form is never prompted.
 */
export function useDiscardGuard(isDirty: boolean, close: () => void) {
  const [open, setOpen] = useState(false)

  const requestClose = useCallback(() => {
    if (isDirty) setOpen(true)
    else close()
  }, [isDirty, close])

  const confirmProps: ConfirmProps = {
    ...DISCARD_COPY,
    open,
    onOpenChange: setOpen,
    onConfirm: () => {
      setOpen(false)
      close()
    },
  }

  return { requestClose, confirmProps }
}

/**
 * For form pages. Blocks in-app navigation (links, sidebar, browser back) while the form is
 * dirty and shows the discard modal. Call `skipOnce()` right before navigating after a save.
 *
 * Closing or reloading the tab can only use the browser's own prompt, which is registered here too.
 */
export function useLeaveGuard(isDirty: boolean) {
  const skip = useRef(false)

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !skip.current && currentLocation.pathname !== nextLocation.pathname,
  )

  useEffect(() => {
    if (!isDirty) return
    const warn = (event: BeforeUnloadEvent) => {
      if (skip.current) return
      event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [isDirty])

  const confirmProps: ConfirmProps = {
    ...DISCARD_COPY,
    open: blocker.state === 'blocked',
    onOpenChange: (open) => {
      if (!open && blocker.state === 'blocked') blocker.reset()
    },
    onConfirm: () => {
      if (blocker.state === 'blocked') blocker.proceed()
    },
  }

  return {
    confirmProps,
    skipOnce: () => {
      skip.current = true
    },
  }
}

import { Toaster as Sonner, type ToasterProps } from 'sonner'

import { useTheme } from '@/lib/useTheme'

export function Toaster(props: ToasterProps) {
  const { theme } = useTheme()
  return (
    <Sonner
      theme={theme}
      position="top-right"
      closeButton
      toastOptions={{
        classNames: {
          toast: '!bg-popover !text-ink !border-border',
          description: '!text-ink-muted',
        },
      }}
      {...props}
    />
  )
}

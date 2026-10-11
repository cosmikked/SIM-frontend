import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/PageHeader'

interface PlaceholderProps {
  title: string
  description: string
}

/** Route stub for a PRD section 7 screen that is wired up but not built yet. */
export function Placeholder({ title, description }: PlaceholderProps) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card>
        <CardContent className="type-caption text-sm">
          This screen is scaffolded but not implemented yet. See backend/PRD.md section 7 for its requirements.
        </CardContent>
      </Card>
    </>
  )
}

export function Forbidden() {
  return (
    <>
      <PageHeader title="Not available" description="Your role does not have access to this page." />
    </>
  )
}

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-background px-4 text-center">
      <p className="type-key-figure">404</p>
      <p className="type-caption text-sm">That page does not exist.</p>
      <a className="text-sm font-semibold text-accent-brand underline" href="/">
        Back to the app
      </a>
    </div>
  )
}

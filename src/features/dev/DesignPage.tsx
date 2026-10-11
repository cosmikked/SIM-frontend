import { ThemeToggle } from '@/components/ThemeToggle'
import { MonoId } from '@/components/MonoId'
import { StatusBadge } from '@/components/StatusBadge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

/** Dev-only reference (route is registered only when import.meta.env.DEV). Toggle the theme to check both modes. */

const SWATCH_GROUPS: { name: string; tokens: [string, string, string][] }[] = [
  {
    name: 'Brand',
    tokens: [
      ['brand', 'var(--brand)', '#1C3B32'],
      ['brand-hover', 'var(--brand-hover)', '#2A4D42'],
      ['accent', 'var(--accent)', '#2E5E4E'],
      ['tint', 'var(--tint)', '#E6EFEB'],
      ['tint-hover', 'var(--tint-hover)', '#D6E6DE'],
      ['tint-border', 'var(--tint-border)', '#A9C9BB'],
    ],
  },
  {
    name: 'On brand',
    tokens: [
      ['on-brand', 'var(--on-brand)', '#FFFFFF'],
      ['on-brand-muted', 'var(--on-brand-muted)', '#DCEBE4'],
      ['on-brand-subtle', 'var(--on-brand-subtle)', '#C9DDD5'],
      ['on-brand-label', 'var(--on-brand-label)', '#A9C9BB'],
      ['brand-divider', 'var(--brand-divider)', '#33574B'],
    ],
  },
  {
    name: 'Neutrals',
    tokens: [
      ['canvas', 'var(--canvas)', '#F3F6F5'],
      ['surface', 'var(--surface)', '#FFFFFF'],
      ['surface-hover', 'var(--surface-hover)', '#F8FAF9'],
      ['border', 'var(--border)', '#D8E0DD'],
      ['border-subtle', 'var(--border-subtle)', '#EDF1F3'],
      ['border-input', 'var(--border-input)', '#C5CED5'],
      ['ink', 'var(--ink)', '#16212B'],
      ['ink-secondary', 'var(--ink-secondary)', '#36434E'],
      ['ink-muted', 'var(--ink-muted)', '#4B5966'],
    ],
  },
  {
    name: 'Status',
    tokens: [
      ['success-bg', 'var(--success-bg)', '#E3F1EA'],
      ['success-fg', 'var(--success-fg)', '#1E4D3E'],
      ['warning-bg', 'var(--warning-bg)', '#FBF1DC'],
      ['warning-fg', 'var(--warning-fg)', '#6B4A00'],
      ['error-bg', 'var(--error-bg)', '#FBE7E7'],
      ['error-fg', 'var(--error-fg)', '#8A1C1C'],
      ['neutral-bg', 'var(--neutral-bg)', '#E8ECEF'],
      ['neutral-fg', 'var(--neutral-fg)', '#36434E'],
    ],
  },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="type-section mb-4">{title}</h2>
      {children}
    </section>
  )
}

export function DesignPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="type-page-title">SIMS design system</h1>
            <p className="type-caption mt-1 text-sm">1b "Green as brand" · colors and typography. Light values shown in hex; dark mode derives from six tokens.</p>
          </div>
          <ThemeToggle />
        </div>

        <Section title="Colors">
          {SWATCH_GROUPS.map((group) => (
            <div key={group.name} className="mb-5">
              <h3 className="type-card mb-2">{group.name}</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                {group.tokens.map(([name, value, hex]) => (
                  <div key={name} className="overflow-hidden rounded-md border">
                    <div className="h-12" style={{ background: value }} />
                    <div className="bg-card p-2">
                      <p className="text-xs font-semibold text-ink">{name}</p>
                      <MonoId className="text-xs">{hex}</MonoId>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Section>

        <Section title="Typography">
          <Card>
            <CardContent className="flex flex-col gap-4">
              <div>
                <p className="type-caption">Page title · 28/700</p>
                <p className="type-page-title">Course offerings</p>
              </div>
              <div>
                <p className="type-caption">Key figure · 30/700</p>
                <p className="type-key-figure">1,248</p>
              </div>
              <div>
                <p className="type-caption">Section heading · 18/600</p>
                <p className="type-section">Enrolled students</p>
              </div>
              <div>
                <p className="type-caption">Card heading · 16/600</p>
                <p className="type-card">Grading deadlines</p>
              </div>
              <div>
                <p className="type-caption">Body · 14/400</p>
                <p className="type-body">Midterm grades are locked once published and cannot be changed by the instructor.</p>
              </div>
              <div>
                <p className="type-caption">Label · 13/600</p>
                <p className="type-label">Student number</p>
              </div>
              <div>
                <p className="type-caption">Caption · 12.5/400</p>
                <p className="type-caption">Visible to the registrar after publication.</p>
              </div>
              <div>
                <p className="type-caption">Table header · 12/600 uppercase</p>
                <p className="type-table-head">Course code</p>
              </div>
              <div>
                <p className="type-caption">Mono ID · 13/400</p>
                <MonoId>2024-00123 · IT-ELEC-101</MonoId>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Delete</Button>
            <Button variant="link">Link</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Section>

        <Section title="Form controls">
          <Card>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="d-text">Text input</Label>
                <Input id="d-text" placeholder="Placeholder" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="d-select">Select</Label>
                <Select defaultValue="regular">
                  <SelectTrigger id="d-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="irregular">Irregular</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="d-error">Error state</Label>
                <Input id="d-error" aria-invalid defaultValue="bad value" />
                <p className="text-[0.8125rem] text-error-fg">The email has already been taken.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="d-disabled">Disabled</Label>
                <Input id="d-disabled" disabled defaultValue="Locked once published" />
              </div>
            </CardContent>
          </Card>
        </Section>

        <Section title="Badges & alerts">
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge tone="success">Success</Badge>
            <Badge tone="warning">Warning</Badge>
            <Badge tone="error">Error</Badge>
            <Badge tone="neutral">Neutral</Badge>
            <Badge tone="tint">Selected chip</Badge>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {['active', 'enrolled', 'published', 'draft', 'irregular', 'inc', 'dropped', 'cancelled', 'inactive', 'closed', 'completed'].map(
              (s) => (
                <StatusBadge key={s} status={s} />
              ),
            )}
          </div>
          <div className="grid gap-3">
            <Alert tone="warning">
              <AlertTitle>Grading deadline passed</AlertTitle>
              <AlertDescription>Midterm grades can no longer be edited for this term.</AlertDescription>
            </Alert>
            <Alert tone="error">
              <AlertTitle>Schedule conflict</AlertTitle>
              <AlertDescription>Room B-204 is already booked on Monday 08:00–10:00.</AlertDescription>
            </Alert>
            <Alert tone="success">
              <AlertDescription>12 grades published, 2 skipped.</AlertDescription>
            </Alert>
          </div>
        </Section>

        <Section title="Card & table">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Open offerings</CardTitle>
              <CardDescription>First Semester 2025–2026</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="type-key-figure">38</p>
            </CardContent>
          </Card>
          <div className="overflow-hidden rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Student no.</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Midterm</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  ['2024-00123', 'Ada Lovelace', '1.25', 'published'],
                  ['2024-00124', 'Alan Turing', '—', 'draft'],
                  ['2024-00125', 'Grace Hopper', '2.00', 'published'],
                ].map(([no, name, grade, status]) => (
                  <TableRow key={no}>
                    <TableCell>
                      <MonoId>{no}</MonoId>
                    </TableCell>
                    <TableCell>{name}</TableCell>
                    <TableCell>{grade}</TableCell>
                    <TableCell>
                      <StatusBadge status={status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Section>

        <Section title="On-brand surface">
          <div className="rounded-lg bg-brand p-5">
            <p className="font-semibold text-on-brand">Primary text on brand</p>
            <p className="text-on-brand-muted">Nav items, secondary text</p>
            <p className="text-on-brand-subtle">Captions, labels</p>
            <p className="text-xs font-semibold tracking-[0.04em] text-on-brand-label uppercase">Nav group heading</p>
            <hr className="my-3 border-brand-divider" />
            <span className="rounded-md bg-accent-brand px-3 py-1.5 text-sm font-medium text-on-brand">Active nav item</span>
          </div>
        </Section>
      </div>
    </div>
  )
}

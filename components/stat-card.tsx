import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = 'brand',
}: {
  label: string
  value: string | number | undefined
  icon: LucideIcon
  hint?: string
  tone?: 'brand' | 'emerald' | 'amber' | 'ruby' | 'gold'
}) {
  const toneMap: Record<string, string> = {
    brand: 'bg-brand/10 text-brand',
    emerald: 'bg-emerald/10 text-emerald',
    amber: 'bg-amber/10 text-amber',
    ruby: 'bg-ruby/10 text-ruby',
    gold: 'bg-gold/15 text-gold',
  }
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', toneMap[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-none text-foreground">{value}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
          {hint && <p className="mt-0.5 truncate text-[11px] text-muted-foreground/70">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

import type { ReactNode } from 'react'
import { Zap } from 'lucide-react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-6 bg-background p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand">
          <Zap className="h-5 w-5 text-brand-foreground" />
        </div>
        <div>
          <p className="text-lg font-bold leading-none text-foreground">
            SkillBoost Hub
          </p>
          <p className="text-xs text-muted-foreground">Learn. Build. Level up.</p>
        </div>
      </div>
      {children}
    </div>
  )
}

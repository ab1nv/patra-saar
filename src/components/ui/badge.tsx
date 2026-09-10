import { cn } from '@/lib/utils'
import type { HTMLAttributes } from 'react'

type Tone = 'neutral' | 'verified' | 'warning' | 'danger' | 'accent'

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-muted border-border',
  verified: 'bg-verified-soft text-verified border-verified/30',
  warning: 'bg-warning-soft text-warning border-warning/30',
  danger: 'bg-danger-soft text-danger border-danger/30',
  accent: 'bg-accent-soft text-accent border-accent/30',
}

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide',
        TONES[tone],
        className,
      )}
      {...props}
    />
  )
}

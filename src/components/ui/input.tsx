import { cn } from '@/lib/utils'
import type { InputHTMLAttributes } from 'react'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-md border border-border bg-surface-2 px-3 text-sm text-foreground placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent/50',
        className,
      )}
      {...props}
    />
  )
}

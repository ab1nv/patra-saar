'use client'

import { useEffect, useRef, useState } from 'react'

export type BarRow = {
  label: string
  value: number
  danger?: boolean
  verified?: boolean
}

function pct(n: number): string {
  return `${Math.round(n * 1000) / 10}%`
}

/** Bars that fill smoothly the first time they scroll into view. */
export function AnimatedBars({ rows }: { rows: BarRow[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setActive(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(true)
            observer.disconnect()
          }
        }
      },
      { threshold: 0.35 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="space-y-3.5">
      {rows.map((r, i) => {
        const color = r.danger ? 'bg-danger' : r.verified ? 'bg-verified' : 'bg-accent'
        return (
          <div key={r.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted">{r.label}</span>
              <span className="tabular-nums text-foreground">{pct(r.value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-2">
              <div
                className={`h-full rounded-full ${color} transition-[width] duration-1000 ease-out`}
                style={{
                  width: active ? `${Math.max(1.5, r.value * 100)}%` : '0%',
                  transitionDelay: `${i * 110}ms`,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

'use client'

import type { ReactNode } from 'react'

/**
 * In-page anchor that always scrolls, even when the hash is already in the URL
 * (a plain href to the same hash does nothing the second time).
 */
export function SectionLink({
  targetId,
  className,
  children,
}: {
  targetId: string
  className?: string
  children: ReactNode
}) {
  return (
    <a
      href={`#${targetId}`}
      className={className}
      onClick={(event) => {
        const target = document.getElementById(targetId)
        if (!target) return
        event.preventDefault()
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        window.history.replaceState(null, '', `#${targetId}`)
      }}
    >
      {children}
    </a>
  )
}

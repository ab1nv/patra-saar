'use client'

import { useEffect } from 'react'

/**
 * Marks the document as hydrated so end-to-end tests can wait deterministically
 * instead of racing React hydration after a full page load.
 */
export function HydrationMarker() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = '1'
  }, [])
  return null
}

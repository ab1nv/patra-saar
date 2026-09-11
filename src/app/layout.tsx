import type { Metadata, Viewport } from 'next'
import './globals.css'
import { HydrationMarker } from '@/components/layout/HydrationMarker'

export const metadata: Metadata = {
  title: 'PatraSaar',
  description:
    'PatraSaar answers questions about Indian central acts using only an indexed corpus of statutory text, and verifies every citation verbatim against the source section.',
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'PatraSaar — It cites the law, or it says it doesn’t know',
    description:
      'Verified citations for Indian central acts, grounded in an indexed corpus of statutory text.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#0b0b0e',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <HydrationMarker />
        {children}
      </body>
    </html>
  )
}

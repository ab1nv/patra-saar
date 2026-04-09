import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PatraSaar - Legal Clarity, Distilled',
  description:
    'Understand Indian legal documents with AI-powered simplification. Upload contracts, FIRs, court orders and get plain-language explanations.',
  keywords: ['legal', 'AI', 'India', 'document', 'simplification', 'RAG'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
        <link rel="icon" href="/favicon-16x16.png" type="image/png" sizes="16x16" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#0c0a09" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}

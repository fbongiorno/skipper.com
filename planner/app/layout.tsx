import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Skipper — Curated Boating Vacations Worldwide',
  description: 'Discover the world\'s most breathtaking waterfront destinations and plan your perfect sailing voyage.',
  keywords: 'boat trip planner, sailing route, nautical planner, skipper, boat rental, waterfront destinations',
  openGraph: {
    title: 'Skipper — Curated Boating Vacations Worldwide',
    description: 'Discover the world\'s most breathtaking waterfront destinations.',
    url: 'https://skipper.com',
    siteName: 'Skipper',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-3W0MF9Q5VZ" />
        <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-3W0MF9Q5VZ');` }} />
      </head>
      <body>{children}</body>
    </html>
  )
}

import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TalentAI — AI-Powered Hiring',
  description: 'End-to-end AI hiring pipeline',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

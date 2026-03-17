import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Internship Management Platform',
  description: 'Manage internship tasks and submissions',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
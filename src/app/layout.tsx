import type { Metadata } from 'next'
import { Cinzel, Jost } from 'next/font/google'
import './globals.css'

const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const jost = Jost({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Feathr — Your AI Marketing Agency',
  description: 'AI-powered marketing for independent creators. 5 minutes a day.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="nl" className={`${cinzel.variable} ${jost.variable} dark`}>
      <body className="min-h-screen bg-bg-base text-text-primary antialiased">
        {children}
      </body>
    </html>
  )
}

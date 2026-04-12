import type { Metadata } from 'next'
import { Cormorant_Infant, Jost } from 'next/font/google'
import './globals.css'

const cormorant = Cormorant_Infant({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
})

const jost = Jost({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'FEATHR — Your AI Marketing Agency',
  description: 'AI-powered marketing for independent creators. 5 minutes a day.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="nl" className={`${cormorant.variable} ${jost.variable} dark`}>
      <body className="min-h-screen bg-bg-base text-text-primary antialiased">
        {children}
      </body>
    </html>
  )
}

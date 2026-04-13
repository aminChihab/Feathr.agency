import type { Metadata } from 'next'
import { Instrument_Serif, Instrument_Sans } from 'next/font/google'
import './globals.css'

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: '400',
  style: ['normal', 'italic'],
})

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
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
    <html lang="en" className={`${instrumentSerif.variable} ${instrumentSans.variable} dark`}>
      <body className="min-h-screen bg-surface text-on-surface antialiased font-body">
        {children}
      </body>
    </html>
  )
}

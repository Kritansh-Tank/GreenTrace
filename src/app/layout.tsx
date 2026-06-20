import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'CarbonSense — Know Your Footprint. Shrink It.',
  description: 'CarbonSense helps individuals understand, track, and reduce their carbon footprint through simple actions and personalized AI-powered insights.',
  keywords: ['carbon footprint', 'sustainability', 'climate', 'CO2 tracker', 'eco-friendly'],
  openGraph: {
    title: 'CarbonSense',
    description: 'Track and reduce your carbon footprint with AI-powered personalized insights.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-slate-50 text-slate-800 antialiased">{children}</body>
    </html>
  )
}

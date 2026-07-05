import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'GreenTrace — Know Your Footprint. Change Your Future.',
  description: 'GreenTrace is an AI-agent platform that helps individuals understand, track, and reduce their carbon footprint through personalized agentic insights and action plans.',
  keywords: ['carbon footprint', 'sustainability', 'climate', 'CO2 tracker', 'eco-friendly', 'AI agent', 'green'],
  openGraph: {
    title: 'GreenTrace',
    description: 'Track and reduce your carbon footprint with an AI agent powered by agentic reasoning.',
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

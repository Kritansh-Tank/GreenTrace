'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Calculator, Target, Lightbulb, Map, Heart, LogOut, Leaf } from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/calculator', icon: Calculator, label: 'Calculator' },
  { href: '/goals', icon: Target, label: 'Goals' },
  { href: '/insights', icon: Lightbulb, label: 'Insights' },
  { href: '/travel', icon: Map, label: 'Eco Routes' },
  { href: '/offset', icon: Heart, label: 'Offset' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [initials, setInitials] = useState('?')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const name: string = data.user?.user_metadata?.name || data.user?.email || ''
      const ini = name.split(/[\s@]/).filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2)
      setInitials(ini || '?')
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Floating island navbar ── */}
      <header className="fixed top-4 sm:top-6 inset-x-0 z-50 flex justify-center px-4 sm:px-6">
        <nav className="bg-white rounded-2xl shadow-lg px-5 h-14 flex items-center gap-3 w-full max-w-5xl">

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0 mr-2">
            <div className="w-7 h-7 rounded-lg bg-green-600 flex items-center justify-center">
              <Leaf className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm text-gray-900 hidden sm:block">CarbonSense</span>
          </Link>

          {/* Center nav */}
          <div className="flex-1 flex items-center justify-center gap-0.5">
            {navItems.map(({ href, icon: Icon, label }) => {
              const active = pathname === href
              return (
                <Link key={href} href={href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                    active ? 'bg-green-50 text-green-700' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}>
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-green-600' : ''}`} />
                  <span className="hidden xl:block">{label}</span>
                </Link>
              )
            })}
          </div>

          {/* Right: avatar + sign out */}
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold tracking-tight">{initials}</span>
            </div>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-red-500 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-all">
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:block text-xs">Sign out</span>
            </button>
          </div>

        </nav>
      </header>

      {/* Main content */}
      <main className="pt-24 sm:pt-28 px-4 sm:px-6 pb-12 max-w-6xl mx-auto w-full">
        {children}
      </main>

    </div>
  )
}

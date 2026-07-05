'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Leaf, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else { router.push('/dashboard'); router.refresh() }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left: form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <Link href="/" className="flex items-center gap-2.5 mb-10">
            <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">GreenTrace</span>
          </Link>

          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-1">Welcome back</h1>
          <p className="text-gray-500 mb-8">Sign in to your account</p>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />{error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="you@example.com"
                  className="w-full bg-white border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm shadow-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input id="login-password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••"
                  className="w-full bg-white border border-gray-200 rounded-xl pl-11 pr-12 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm shadow-sm" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" id="login-submit" disabled={loading} className="btn-pill w-full justify-center !pl-6">
              {loading
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <>Sign In <span className="arrow-circle !w-8 !h-8"><ArrowRight className="w-3.5 h-3.5" /></span></>}
            </button>
          </form>

          <p className="text-sm text-gray-500 mt-6 text-center">
            No account?{' '}
            <Link href="/register" className="text-green-600 font-semibold hover:text-green-700">Create one free</Link>
          </p>
        </div>
      </div>

      {/* Right: image panel */}
      <div className="hidden lg:flex flex-1 relative">
        <img src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80"
          alt="Green nature" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-green-900/50 flex flex-col items-start justify-end p-14">
          <blockquote className="text-white text-2xl font-bold leading-snug mb-3">
            "Small daily actions,<br />compounded over time,<br />change the world."
          </blockquote>
          <p className="text-green-200 text-sm">— GreenTrace</p>
        </div>
      </div>
    </div>
  )
}

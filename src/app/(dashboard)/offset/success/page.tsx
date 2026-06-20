'use client'
import Link from 'next/link'
import { CheckCircle, ArrowRight } from 'lucide-react'

export default function OffsetSuccessPage() {
  return (
    <div className="max-w-md mx-auto text-center py-20">
      <CheckCircle className="w-20 h-20 text-emerald-500 mx-auto mb-6" />
      <h1 className="text-3xl font-bold text-slate-900 mb-3">Thank you! 🌿</h1>
      <p className="text-slate-500 mb-8">Your donation has been processed. You&apos;re making a real difference for the planet.</p>
      <Link href="/dashboard" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold inline-flex items-center gap-2">
        Back to Dashboard <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  )
}

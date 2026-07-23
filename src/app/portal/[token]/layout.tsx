'use client'

import Link from 'next/link'
import { usePathname, useParams } from 'next/navigation'
import { Shield, FileText, ClipboardCheck, AlertTriangle, TrendingUp } from 'lucide-react'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const params = useParams()
  const token = params.token as string

  const navItems = [
    { href: `/portal/${token}`, label: 'Overview', icon: Shield, exact: true },
    { href: `/portal/${token}/standard`, label: 'Standards', icon: FileText },
    { href: `/portal/${token}/registers`, label: 'Registers', icon: AlertTriangle },
    { href: `/portal/${token}/self-assessment`, label: 'Self-Assessment', icon: ClipboardCheck },
  ]

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Security banner */}
      <div className="border-b border-slate-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-[#1a2332]" />
            <span className="font-heading text-base font-bold text-[#1a2332]">AuditReady — Auditor Portal</span>
          </div>
          <p className="text-xs text-slate-500">
            Read-only access · Data encrypted in transit · Australian data sovereignty
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1200px] px-6">
          <nav className="flex gap-1">
            {navItems.map(item => {
              const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-b-2 border-[#1a2332] text-[#1a2332]'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-[1200px] px-6 py-8">
        {children}
      </main>

      {/* Print: hide nav */}
      <style>{`@media print { nav, [data-portal-nav] { display: none !important; } }`}</style>
    </div>
  )
}

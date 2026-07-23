'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  ListChecks,
  FileText,
  Shield,
  ShieldCheck,
  Users,
  AlertTriangle,
  TrendingUp,
  Package,
  ClipboardCheck,
  Menu,
  X,
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/evidence', label: 'Checklist', icon: ListChecks },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/standards', label: 'Standards', icon: Shield },
  { href: '/rules', label: 'Rules', icon: ShieldCheck },
  { href: '/workers', label: 'Workers', icon: Users },
  { href: '/incidents', label: 'Incidents', icon: AlertTriangle },
  { href: '/improvements', label: 'Improvements', icon: TrendingUp },
  { href: '/audit/pack', label: 'Audit Pack', icon: Package },
  { href: '/audit/self-assessment', label: 'Self-Assessment', icon: ClipboardCheck },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen">
      {/* Mobile burger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 rounded-md bg-[#1a2332] p-2 text-white md:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[220px] flex-col bg-[#1a2332] text-white transition-transform md:static md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <span className="font-heading text-lg font-bold text-white">AuditReady</span>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded p-1 text-white/70 hover:text-white md:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 px-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-[#f8fafc]">
        <div className="mx-auto max-w-[1200px] px-6 py-8 md:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}

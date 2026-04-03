import Link from 'next/link'
import type { ReactNode } from 'react'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-200">
          <Link href="/" className="font-bold text-lg text-brand-600">TalentAI</Link>
          <div className="text-xs text-gray-500 mt-0.5">Hiring Dashboard</div>
        </div>
        <nav className="p-3 flex-1 space-y-1">
          <NavLink href="/admin">📊 Overview</NavLink>
          <NavLink href="/admin/candidates">👥 Candidates</NavLink>
          <NavLink href="/careers" external>🏢 Career Portal</NavLink>
        </nav>
        <div className="p-3 border-t border-gray-200">
          <div className="text-xs text-gray-400">AI Threshold: {process.env.SHORTLIST_THRESHOLD || '65'}/100</div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

function NavLink({
  href,
  children,
  external,
}: {
  href: string
  children: ReactNode
  external?: boolean
}) {
  return (
    <Link
      href={href}
      target={external ? '_blank' : undefined}
      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
    >
      {children}
    </Link>
  )
}

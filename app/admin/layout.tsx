import Link from 'next/link'
import type { ReactNode } from 'react'
import { LayoutDashboard, Users, Briefcase, type LucideIcon } from 'lucide-react'

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-zinc-200 flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-zinc-100">
          <Link href="/" className="font-semibold text-base text-zinc-900 tracking-tight">
            TalentAI
          </Link>
          <div className="text-xs text-zinc-400 mt-0.5">Hiring Dashboard</div>
        </div>

        <nav className="p-3 flex-1 space-y-0.5">
          <NavLink href="/admin" icon={LayoutDashboard}>Overview</NavLink>
          <NavLink href="/admin/candidates" icon={Users}>Candidates</NavLink>
          <NavLink href="/careers" external icon={Briefcase}>Career Portal</NavLink>
        </nav>

        <div className="px-5 py-4 border-t border-zinc-100">
          <div className="text-xs text-zinc-400">
            Shortlist threshold:{' '}
            <span className="font-medium text-zinc-600">
              {process.env.SHORTLIST_THRESHOLD || '65'}
            </span>
            /100
          </div>
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
  icon: Icon,
}: {
  href: string
  children: ReactNode
  external?: boolean
  icon?: LucideIcon
}) {
  return (
    <Link
      href={href}
      target={external ? '_blank' : undefined}
      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />}
      {children}
    </Link>
  )
}

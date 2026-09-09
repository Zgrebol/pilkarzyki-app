'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  TableCellsIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  ArrowsRightLeftIcon,
  TrophyIcon,
  BoltIcon,
  WrenchScrewdriverIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'

type NavItem = {
  label: string
  path: string
  icon: React.ComponentType<{ className?: string }>
}

const MAIN_NAV: NavItem[] = [
  { label: 'Tabela', path: '', icon: TableCellsIcon },
  { label: 'Członkowie', path: '/czlonkowie', icon: UsersIcon },
  { label: 'Składy', path: '/sklady', icon: ClipboardDocumentListIcon },
  { label: 'Terminarz', path: '/terminarz', icon: CalendarDaysIcon },
  { label: 'Transfery', path: '/transfery', icon: ArrowsRightLeftIcon },
  { label: 'Puchar Piłkarzyków', path: '/puchar', icon: TrophyIcon },
  { label: 'Żelazne trójki', path: '/zelazne-trojki', icon: BoltIcon },
]

const MOD_NAV: NavItem[] = [
  { label: 'Edytuj terminarz', path: '/edytuj-terminarz', icon: WrenchScrewdriverIcon },
  { label: 'Edytuj skład', path: '/edytuj-sklad', icon: UserGroupIcon },
]

function NavLink({
  href,
  isActive,
  isMod,
  children,
}: {
  href: string
  isActive: boolean
  isMod?: boolean
  children: React.ReactNode
}) {
  if (isMod) {
    return (
      <Link
        href={href}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors whitespace-nowrap ${
          isActive
            ? 'bg-yellow-800/40 text-yellow-200 border border-yellow-700/60'
            : 'text-yellow-700 hover:text-yellow-300 hover:bg-yellow-900/20'
        }`}
      >
        {children}
      </Link>
    )
  }
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors whitespace-nowrap ${
        isActive
          ? 'bg-blue-700/30 text-white border border-blue-700/50'
          : 'text-gray-400 hover:text-white hover:bg-gray-800'
      }`}
    >
      {children}
    </Link>
  )
}

export default function SidebarNav({
  leagueId,
  canModerate,
}: {
  leagueId: string
  canModerate: boolean
}) {
  const pathname = usePathname()

  return (
    <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-1 md:pb-0">
      {MAIN_NAV.map(item => {
        const href = `/leagues/${leagueId}${item.path}`
        const isActive =
          item.path === ''
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`)
        return (
          <NavLink key={item.path} href={href} isActive={isActive}>
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="md:inline">{item.label}</span>
          </NavLink>
        )
      })}

      {canModerate && (
        <>
          <div className="hidden md:block border-t border-gray-700 my-2" />
          <p className="hidden md:block text-[10px] font-semibold uppercase tracking-widest text-gray-600 px-3 pb-1">
            Panel moderatora
          </p>
          {/* mobile separator */}
          <div className="md:hidden w-px h-6 bg-gray-700 self-center shrink-0 mx-1" />
          {MOD_NAV.map(item => {
            const href = `/leagues/${leagueId}${item.path}`
            const isActive = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <NavLink key={item.path} href={href} isActive={isActive} isMod>
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="md:inline">{item.label}</span>
              </NavLink>
            )
          })}
        </>
      )}
    </nav>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { label: 'Główna', path: '' },
  { label: 'Członkowie', path: '/czlonkowie' },
  { label: 'Terminarz', path: '/terminarz' },
  { label: 'Strzelcy', path: '/strzelcy' },
]

export default function TabsNav({ leagueId }: { leagueId: string }) {
  const pathname = usePathname()

  return (
    <nav className="flex border-b border-gray-700 mb-6 overflow-x-auto">
      {TABS.map(tab => {
        const href = `/leagues/${leagueId}${tab.path}`
        const isActive = tab.path === ''
          ? pathname === href
          : pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={tab.path}
            href={href}
            className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${
              isActive
                ? 'border-blue-400 text-white font-medium'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}

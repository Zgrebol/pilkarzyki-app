import { type ReactNode } from 'react'

export function Card({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`bg-gray-800 rounded-lg ${className ?? ''}`}>
      {children}
    </div>
  )
}

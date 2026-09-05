import { type ReactNode } from 'react'

type Variant =
  | 'admin'
  | 'mod'
  | 'player'
  | 'public'
  | 'private'
  | 'locked'
  | 'pairs-ok'
  | 'neutral'
  | 'warning'
  | 'danger'

const variantCls: Record<Variant, string> = {
  admin:     'bg-yellow-800/60 text-yellow-300',
  mod:       'bg-blue-900/60 text-blue-300',
  player:    'bg-gray-700 text-gray-300',
  public:    'bg-green-800/60 text-green-300',
  private:   'bg-gray-700 text-gray-400',
  locked:    'bg-gray-700 text-gray-400',
  'pairs-ok':'bg-green-900/60 text-green-300',
  neutral:   'bg-gray-700 text-gray-400',
  warning:   'bg-yellow-900/60 text-yellow-400',
  danger:    'bg-red-900/60 text-red-300',
}

export function Badge({
  variant,
  children,
  className,
}: {
  variant: Variant
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs rounded px-2 py-0.5 ${variantCls[variant]} ${className ?? ''}`}
    >
      {children}
    </span>
  )
}

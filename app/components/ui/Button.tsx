import { type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variantCls: Record<Variant, string> = {
  primary:   'bg-blue-700 hover:bg-blue-600 text-white border-transparent',
  secondary: 'bg-gray-700 hover:bg-gray-600 text-white border-transparent',
  danger:    'bg-red-800  hover:bg-red-700  text-white border-transparent',
  ghost:     'bg-transparent border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white',
}

const sizeCls: Record<Size, string> = {
  sm: 'text-xs px-2 py-0.5 rounded',
  md: 'text-sm px-3 py-1 rounded',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={cn(
        'inline-flex items-center gap-1.5 border font-medium transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantCls[variant],
        sizeCls[size],
        className,
      )}
    >
      {children}
    </button>
  )
}

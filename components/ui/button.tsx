import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive active:translate-y-px",
  {
    variants: {
      variant: {
        default: 'bg-primary text-white shadow-[0_18px_38px_-24px_rgba(79,70,229,0.55)] hover:bg-primary/92 hover:shadow-[0_20px_42px_-22px_rgba(79,70,229,0.5)]',
        destructive:
          'bg-destructive text-white shadow-[0_18px_38px_-24px_rgba(220,38,38,0.5)] hover:bg-destructive/90 focus-visible:ring-destructive/20',
        outline:
          'border border-slate-200/80 bg-white text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-800',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/92',
        ghost:
          'text-slate-600 hover:bg-slate-100 hover:text-slate-800',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-9 rounded-xl gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-11 rounded-[1rem] px-6 has-[>svg]:px-4',
        icon: 'size-10',
        'icon-sm': 'size-9',
        'icon-lg': 'size-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

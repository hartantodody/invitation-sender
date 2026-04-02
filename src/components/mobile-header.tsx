"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

export type HeaderNavItem = {
  href: string
  label: string
}

type MobileHeaderProps = {
  title: string
  subtitle?: string
  navItems?: HeaderNavItem[]
  action?: React.ReactNode
}

export function MobileHeader({ title, subtitle, navItems, action }: MobileHeaderProps) {
  const pathname = usePathname()

  return (
    <header className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {subtitle ? <p className="text-sm leading-relaxed text-muted-foreground">{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      {navItems?.length ? (
        <nav
          aria-label="Main navigation"
          className={cn(
            "grid rounded-xl border border-border/80 bg-[#edf4ee] p-1",
            navItems.length === 2
              ? "grid-cols-2"
              : navItems.length === 3
                ? "grid-cols-3"
                : "grid-cols-4"
          )}
        >
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && item.href !== "/send" && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-2 py-2.5 text-center text-xs font-medium transition-colors sm:text-sm",
                  isActive ? "bg-white text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      ) : null}
    </header>
  )
}

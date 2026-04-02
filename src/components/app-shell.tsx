import { cn } from "@/lib/utils"

type AppShellProps = {
  children: React.ReactNode
  className?: string
  size?: "sm" | "md" | "lg" | "xl"
}

const sizeClassMap: Record<NonNullable<AppShellProps["size"]>, string> = {
  sm: "max-w-md",
  md: "max-w-3xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
}

export function AppShell({ children, className, size = "md" }: AppShellProps) {
  return (
    <div className="min-h-screen bg-linear-to-b from-[#f8fbf8] to-white">
      <div className={cn("mx-auto w-full px-4 py-5 sm:px-6 sm:py-7", sizeClassMap[size], className)}>
        {children}
      </div>
    </div>
  )
}

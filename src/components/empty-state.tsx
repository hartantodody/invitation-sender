import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Card className="border border-dashed border-border/80 bg-[#f9fcf9] py-0 shadow-none">
      <CardContent className="flex flex-col items-center gap-3 px-5 py-8 text-center">
        <div className="rounded-full bg-[#e9f2ea] p-3">
          <Icon className="size-5 text-[#3f6f4d]" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {actionLabel && onAction ? (
          <Button variant="outline" className="h-10 rounded-xl bg-white px-4" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}

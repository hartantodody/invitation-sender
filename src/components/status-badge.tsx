import { Badge } from "@/components/ui/badge"
import type { GuestStatus } from "@/lib/types"

type StatusBadgeProps = {
  status: GuestStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  if (status === "sent") {
    return <Badge className="bg-[#d6ead8] text-[#1f5a31] hover:bg-[#d6ead8]">Terkirim</Badge>
  }

  return <Badge variant="secondary">Belum Terkirim</Badge>
}

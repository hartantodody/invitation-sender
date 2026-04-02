import { CheckCircle2Icon, Clock3Icon, CopyIcon, MessageCircleIcon, TimerIcon } from "lucide-react"

import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getGuestShiftLabel } from "@/lib/guest-shift"
import type { Guest } from "@/lib/types"

type GuestCardProps = {
  guest: Guest
  onCopyMessage: (guest: Guest) => void
  onOpenWhatsApp: (guest: Guest) => void
  onMarkAsSent: (guest: Guest) => void
  copiedRecently?: boolean
  isMarkingAsSent?: boolean
}

function formatSentAt(sentAt: string | null) {
  if (!sentAt) return "-"

  return new Date(sentAt).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function GuestCard({
  guest,
  onCopyMessage,
  onOpenWhatsApp,
  onMarkAsSent,
  copiedRecently = false,
  isMarkingAsSent = false,
}: GuestCardProps) {
  const isSent = guest.status === "sent"

  return (
    <Card className="gap-3 rounded-2xl border border-border/80 bg-white py-0 shadow-none">
      <CardHeader className="space-y-3 border-b border-border/70 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base font-semibold leading-tight">{guest.name}</CardTitle>
          <StatusBadge status={guest.status} />
        </div>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>{guest.phone}</p>
          <p className="inline-flex items-center gap-1.5 text-xs">
            <TimerIcon className="size-3.5" />
            {getGuestShiftLabel(guest.shift)}
          </p>
          <p className="inline-flex items-center gap-1.5 text-xs">
            <Clock3Icon className="size-3.5" />
            Terkirim: {formatSentAt(guest.sentAt)}
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-2.5 px-4 pb-4">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="h-11 rounded-xl bg-white text-sm"
            onClick={() => onCopyMessage(guest)}
          >
            <CopyIcon className="size-4" />
            {copiedRecently ? "Tersalin" : "Salin Pesan"}
          </Button>
          <Button className="h-11 rounded-xl bg-[#2f6f44] text-sm hover:bg-[#2a663e]" onClick={() => onOpenWhatsApp(guest)}>
            <MessageCircleIcon className="size-4" />
            Buka WhatsApp
          </Button>
        </div>

        <Button
          disabled={isSent || isMarkingAsSent}
          variant={isSent ? "secondary" : "default"}
          className="h-11 w-full rounded-xl text-sm"
          onClick={() => onMarkAsSent(guest)}
        >
          <CheckCircle2Icon className="size-4" />
          {isSent ? "Sudah Terkirim" : isMarkingAsSent ? "Menyimpan..." : "Tandai Terkirim"}
        </Button>
      </CardContent>
    </Card>
  )
}

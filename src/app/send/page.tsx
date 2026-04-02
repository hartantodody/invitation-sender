"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ClipboardCheckIcon, InboxIcon, Loader2Icon, UsersRoundIcon } from "lucide-react"
import { toast } from "sonner"

import { AppShell } from "@/components/app-shell"
import { EmptyState } from "@/components/empty-state"
import { GuestCard } from "@/components/guest-card"
import { MobileHeader } from "@/components/mobile-header"
import { SearchInput } from "@/components/search-input"
import { SignOutButton } from "@/components/sign-out-button"
import { StatsSummary } from "@/components/stats-summary"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  buildInvitationMessage,
  buildWhatsAppUrl,
  copyToClipboard,
} from "@/lib/invitation-utils"
import { protectedNavItems } from "@/lib/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  AUTH_REQUIRED_ERROR,
  ensureInvitationSettings,
  fetchGuests,
  getAuthenticatedUserId,
  markGuestAsSent,
} from "@/lib/supabase/data"
import { hasSupabasePublicEnv, missingSupabaseEnvMessage } from "@/lib/supabase/env"
import type { Guest, InvitationLanguage, InvitationSettings } from "@/lib/types"

type SendFilter = "all" | "pending" | "sent"

const sendFilterOptions: { value: SendFilter; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "pending", label: "Belum Terkirim" },
  { value: "sent", label: "Terkirim" },
]

export default function SendPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const isSupabaseConfigured = hasSupabasePublicEnv()

  const [guests, setGuests] = useState<Guest[]>([])
  const [settings, setSettings] = useState<InvitationSettings | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [markingGuestId, setMarkingGuestId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<SendFilter>("all")
  const [sendLanguage, setSendLanguage] = useState<InvitationLanguage>("id")
  const [lastCopiedGuestId, setLastCopiedGuestId] = useState<string | null>(null)

  const loadPageData = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    if (!isSupabaseConfigured) {
      setErrorMessage(missingSupabaseEnvMessage)
      setIsLoading(false)
      return
    }

    try {
      const nextUserId = await getAuthenticatedUserId(supabase)
      const [nextSettings, nextGuests] = await Promise.all([
        ensureInvitationSettings(supabase, nextUserId),
        fetchGuests(supabase, nextUserId),
      ])

      setUserId(nextUserId)
      setSettings(nextSettings)
      setGuests(nextGuests)
    } catch (error) {
      if (error instanceof Error && error.message === AUTH_REQUIRED_ERROR) {
        router.replace("/login")
        return
      }

      setErrorMessage("Data undangan belum bisa dimuat. Coba lagi sebentar.")
    } finally {
      setIsLoading(false)
    }
  }, [isSupabaseConfigured, router, supabase])

  useEffect(() => {
    void loadPageData()
  }, [loadPageData])

  const totalGuests = guests.length
  const sentCount = guests.filter((guest) => guest.status === "sent").length
  const pendingCount = totalGuests - sentCount

  const filteredGuests = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    return guests.filter((guest) => {
      const searchableText = `${guest.name} ${guest.phone} ${guest.guestFrom}`.toLowerCase()
      const matchesSearch = searchableText.includes(normalizedQuery)
      if (!matchesSearch) return false

      if (statusFilter === "all") return true
      if (statusFilter === "pending") return guest.status === "pending"

      return guest.status === "sent"
    })
  }, [guests, searchQuery, statusFilter])

  const handleCopyMessage = async (guest: Guest) => {
    if (!settings) {
      toast.error("Pengaturan undangan belum siap.")
      return
    }

    const message = buildInvitationMessage(settings, guest, sendLanguage)
    const copied = await copyToClipboard(message)

    if (!copied) {
      toast.error("Gagal menyalin pesan. Coba lagi.")
      return
    }

    setLastCopiedGuestId(guest.id)
    toast.success(`Pesan untuk ${guest.name} berhasil disalin`)

    window.setTimeout(() => {
      setLastCopiedGuestId((current) => (current === guest.id ? null : current))
    }, 1600)
  }

  const handleOpenWhatsApp = (guest: Guest) => {
    if (!settings) {
      toast.error("Pengaturan undangan belum siap.")
      return
    }

    const message = buildInvitationMessage(settings, guest, sendLanguage)
    const whatsappUrl = buildWhatsAppUrl(guest.phone, message)
    window.open(whatsappUrl, "_blank", "noopener,noreferrer")
  }

  const handleMarkAsSent = async (guest: Guest) => {
    if (guest.status === "sent" || !userId) return

    setMarkingGuestId(guest.id)

    try {
      const updatedGuest = await markGuestAsSent(supabase, userId, guest.id)
      setGuests((currentGuests) =>
        currentGuests.map((currentGuest) =>
          currentGuest.id === updatedGuest.id ? updatedGuest : currentGuest
        )
      )
      toast.success(`${guest.name} ditandai terkirim`)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Status tamu belum bisa diperbarui."
      toast.error(message)
    } finally {
      setMarkingGuestId(null)
    }
  }

  return (
    <AppShell size="xl">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <MobileHeader
          title="Kirim Undangan"
          subtitle="Alur cepat: salin pesan, buka WhatsApp, lalu tandai terkirim."
          navItems={protectedNavItems}
          action={<SignOutButton />}
        />

        <StatsSummary total={totalGuests} sent={sentCount} pending={pendingCount} />

        <div className="space-y-2.5">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Cari nama, nomor, atau guest dari..."
          />

          <div className="rounded-xl border border-border/80 bg-[#f7faf7] px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">Bahasa Pesan</p>
              <Select
                value={sendLanguage}
                onValueChange={(value) => setSendLanguage(value as InvitationLanguage)}
              >
                <SelectTrigger className="h-9 min-w-32 rounded-lg bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="id">Indonesia</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 rounded-xl border border-border/80 bg-[#edf4ee] p-1">
            {sendFilterOptions.map((option) => (
              <Button
                key={option.value}
                variant={statusFilter === option.value ? "secondary" : "ghost"}
                className="h-10 rounded-lg text-sm"
                onClick={() => setStatusFilter(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <section className="space-y-3 pb-4">
          {isLoading ? (
            <Card className="rounded-2xl border border-border/80 bg-white py-0 shadow-none">
              <CardContent className="flex items-center gap-2 px-4 py-5 text-sm text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin text-[#2f6f44]" />
                Memuat daftar tamu dan pengaturan...
              </CardContent>
            </Card>
          ) : errorMessage ? (
            <EmptyState
              icon={InboxIcon}
              title="Data undangan belum bisa dimuat"
              description={errorMessage}
              actionLabel="Coba Lagi"
              onAction={() => {
                void loadPageData()
              }}
            />
          ) : guests.length === 0 ? (
            <EmptyState
              icon={UsersRoundIcon}
              title="Belum ada tamu"
              description="Tambahkan tamu pertama dari halaman Kelola Tamu."
            />
          ) : filteredGuests.length === 0 ? (
            <EmptyState
              icon={InboxIcon}
              title="Tamu tidak ditemukan"
              description="Coba kata kunci lain atau ubah filter."
              actionLabel="Reset Pencarian"
              onAction={() => {
                setSearchQuery("")
                setStatusFilter("all")
              }}
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredGuests.map((guest) => (
                <GuestCard
                  key={guest.id}
                  guest={guest}
                  onCopyMessage={handleCopyMessage}
                  onOpenWhatsApp={handleOpenWhatsApp}
                  onMarkAsSent={handleMarkAsSent}
                  copiedRecently={lastCopiedGuestId === guest.id}
                  isMarkingAsSent={markingGuestId === guest.id}
                />
              ))}
            </div>
          )}
        </section>

        <div className="rounded-xl border border-border/80 bg-[#f6faf6] px-3 py-2 text-xs text-muted-foreground">
          <p className="inline-flex items-center gap-1.5">
            <ClipboardCheckIcon className="size-3.5" />
            Tips: Tandai tamu sebagai terkirim setelah WhatsApp terbuka agar progres tetap akurat.
          </p>
        </div>
      </div>
    </AppShell>
  )
}

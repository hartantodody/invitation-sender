"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ClipboardCheckIcon, InboxIcon, Loader2Icon, UsersRoundIcon } from "lucide-react"
import { toast } from "sonner"

import { AppShell } from "@/components/app-shell"
import { EmptyState } from "@/components/empty-state"
import { GuestCard } from "@/components/guest-card"
import { MobileHeader } from "@/components/mobile-header"
import { PaginationControls } from "@/components/pagination-controls"
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
import { buildInvitationMessage, buildWhatsAppUrl, copyToClipboard } from "@/lib/invitation-utils"
import { protectedNavItems } from "@/lib/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  AUTH_REQUIRED_ERROR,
  ensureInvitationSettings,
  fetchGuestFromOptions,
  fetchGuestsPage,
  fetchGuestStats,
  getAuthenticatedUserId,
  markGuestAsSent,
  type GuestStatusFilter,
} from "@/lib/supabase/data"
import { hasSupabasePublicEnv, missingSupabaseEnvMessage } from "@/lib/supabase/env"
import { getSupabaseErrorMessage } from "@/lib/supabase/error"
import type { Guest, InvitationLanguage, InvitationSettings } from "@/lib/types"

type GuestStats = {
  total: number
  sent: number
  pending: number
}

const PAGE_SIZE = 9
const SEARCH_DEBOUNCE_MS = 350
const allGuestFromFilterValue = "__all_guest_from__"
const sendFilterOptions: { value: GuestStatusFilter; label: string }[] = [
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
  const [guestFromOptions, setGuestFromOptions] = useState<string[]>([])
  const [stats, setStats] = useState<GuestStats>({
    total: 0,
    sent: 0,
    pending: 0,
  })
  const [totalGuests, setTotalGuests] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchInput, setSearchInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<GuestStatusFilter>("all")
  const [guestFromFilter, setGuestFromFilter] = useState(allGuestFromFilterValue)
  const [sendLanguage, setSendLanguage] = useState<InvitationLanguage>("id")
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [isGuestsLoading, setIsGuestsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [markingGuestId, setMarkingGuestId] = useState<string | null>(null)
  const [lastCopiedGuestId, setLastCopiedGuestId] = useState<string | null>(null)

  const isLoading = isBootstrapping || isGuestsLoading

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setSearchQuery(searchInput.trim())
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [searchInput])

  const loadGuestStats = useCallback(
    async (activeUserId?: string) => {
      const resolvedUserId = activeUserId ?? userId
      if (!resolvedUserId) return

      const nextStats = await fetchGuestStats(supabase, resolvedUserId)
      setStats(nextStats)
    },
    [supabase, userId]
  )

  const loadGuestsPage = useCallback(
    async (activeUserId?: string, pageOverride?: number) => {
      const resolvedUserId = activeUserId ?? userId
      const resolvedPage = pageOverride ?? currentPage

      if (!resolvedUserId) return

      setIsGuestsLoading(true)
      setErrorMessage(null)

      if (!isSupabaseConfigured) {
        setErrorMessage(missingSupabaseEnvMessage)
        setIsGuestsLoading(false)
        return
      }

      try {
        const { guests: nextGuests, totalCount } = await fetchGuestsPage(supabase, {
          userId: resolvedUserId,
          page: resolvedPage,
          pageSize: PAGE_SIZE,
          searchQuery,
          status: statusFilter,
          guestFrom: guestFromFilter === allGuestFromFilterValue ? null : guestFromFilter,
        })

        const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
        if (resolvedPage > totalPages) {
          setCurrentPage(totalPages)
          return
        }

        setGuests(nextGuests)
        setTotalGuests(totalCount)
      } catch (error) {
        if (error instanceof Error && error.message === AUTH_REQUIRED_ERROR) {
          router.replace("/login")
          return
        }

        setErrorMessage(getSupabaseErrorMessage(error, "Data undangan belum bisa dimuat. Coba lagi sebentar."))
      } finally {
        setIsGuestsLoading(false)
      }
    },
    [currentPage, guestFromFilter, isSupabaseConfigured, router, searchQuery, statusFilter, supabase, userId]
  )

  const initializePage = useCallback(async () => {
    setIsBootstrapping(true)
    setErrorMessage(null)

    if (!isSupabaseConfigured) {
      setErrorMessage(missingSupabaseEnvMessage)
      setIsBootstrapping(false)
      return
    }

    try {
      const nextUserId = await getAuthenticatedUserId(supabase)
      const [nextSettings, nextGuestFromOptions] = await Promise.all([
        ensureInvitationSettings(supabase, nextUserId),
        fetchGuestFromOptions(supabase, nextUserId),
      ])

      setUserId(nextUserId)
      setSettings(nextSettings)
      setGuestFromOptions(nextGuestFromOptions)
      setSendLanguage((currentLanguage) => {
        const hasLanguage = nextSettings.templates.some(
          (template) => template.languageCode === currentLanguage
        )
        return hasLanguage ? currentLanguage : (nextSettings.templates[0]?.languageCode ?? "id")
      })

      await loadGuestStats(nextUserId)
    } catch (error) {
      if (error instanceof Error && error.message === AUTH_REQUIRED_ERROR) {
        router.replace("/login")
        return
      }

      setErrorMessage(getSupabaseErrorMessage(error, "Data undangan belum bisa dimuat. Coba lagi sebentar."))
    } finally {
      setIsBootstrapping(false)
    }
  }, [isSupabaseConfigured, loadGuestStats, router, supabase])

  useEffect(() => {
    void initializePage()
  }, [initializePage])

  useEffect(() => {
    if (!userId || isBootstrapping) return
    void loadGuestsPage(userId)
  }, [currentPage, isBootstrapping, loadGuestsPage, searchQuery, statusFilter, guestFromFilter, userId])

  useEffect(() => {
    if (!settings?.templates.length) return

    const hasSelectedLanguage = settings.templates.some(
      (template) => template.languageCode === sendLanguage
    )

    if (!hasSelectedLanguage) {
      setSendLanguage(settings.templates[0].languageCode)
    }
  }, [sendLanguage, settings])

  const sendLanguageOptions = useMemo(
    () => settings?.templates.filter((template) => template.languageCode.trim()) ?? [],
    [settings]
  )

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
    if (!guest.phone?.trim()) {
      toast.error(`Nomor WhatsApp untuk ${guest.name} belum diisi.`)
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
      await markGuestAsSent(supabase, userId, guest.id)
      await Promise.all([loadGuestStats(userId), loadGuestsPage(userId)])
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

        <StatsSummary total={stats.total} sent={stats.sent} pending={stats.pending} />

        <div className="space-y-2.5">
          <SearchInput
            value={searchInput}
            onChange={(value) => {
              setSearchInput(value)
              setCurrentPage(1)
            }}
            placeholder="Cari nama, nomor, atau guest dari..."
          />

          <div className="rounded-xl border border-border/80 bg-[#f7faf7] px-3 py-2.5">
            <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">Bahasa Pesan</p>
                <Select value={sendLanguage} onValueChange={setSendLanguage}>
                  <SelectTrigger className="h-9 min-w-32 rounded-lg bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sendLanguageOptions.map((template) => (
                      <SelectItem key={template.id} value={template.languageCode}>
                        {template.languageLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">Guest Dari</p>
                <Select
                  value={guestFromFilter}
                  onValueChange={(value) => {
                    setGuestFromFilter(value)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="h-9 min-w-36 rounded-lg bg-white">
                    <SelectValue placeholder="Semua" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={allGuestFromFilterValue}>Semua</SelectItem>
                    {guestFromOptions.map((guestFrom) => (
                      <SelectItem key={guestFrom} value={guestFrom}>
                        {guestFrom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 rounded-xl border border-border/80 bg-[#edf4ee] p-1">
            {sendFilterOptions.map((option) => (
              <Button
                key={option.value}
                variant={statusFilter === option.value ? "secondary" : "ghost"}
                className="h-10 rounded-lg text-sm"
                onClick={() => {
                  setStatusFilter(option.value)
                  setCurrentPage(1)
                }}
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
                if (userId) {
                  void Promise.all([loadGuestStats(userId), loadGuestsPage(userId)])
                  return
                }
                void initializePage()
              }}
            />
          ) : stats.total === 0 ? (
            <EmptyState
              icon={UsersRoundIcon}
              title="Belum ada tamu"
              description="Tambahkan tamu pertama dari halaman Kelola Tamu."
            />
          ) : guests.length === 0 ? (
            <EmptyState
              icon={InboxIcon}
              title="Tamu tidak ditemukan"
              description="Coba kata kunci lain atau ubah filter."
              actionLabel="Reset Pencarian"
              onAction={() => {
                setSearchInput("")
                setSearchQuery("")
                setStatusFilter("all")
                setGuestFromFilter(allGuestFromFilterValue)
                setCurrentPage(1)
              }}
            />
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {guests.map((guest) => (
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

              <PaginationControls
                page={currentPage}
                pageSize={PAGE_SIZE}
                totalCount={totalGuests}
                isLoading={isLoading}
                onPageChange={setCurrentPage}
              />
            </>
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

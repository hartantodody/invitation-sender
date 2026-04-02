"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { InboxIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { AppShell } from "@/components/app-shell"
import { EmptyState } from "@/components/empty-state"
import { MobileHeader } from "@/components/mobile-header"
import { SettingsForm } from "@/components/settings-form"
import { SignOutButton } from "@/components/sign-out-button"
import { Card, CardContent } from "@/components/ui/card"
import { buildInvitationMessage } from "@/lib/invitation-utils"
import { protectedNavItems } from "@/lib/navigation"
import { createClient } from "@/lib/supabase/client"
import {
  AUTH_REQUIRED_ERROR,
  ensureInvitationSettings,
  fetchGuests,
  getAuthenticatedUserId,
  upsertInvitationSettings,
} from "@/lib/supabase/data"
import { hasSupabasePublicEnv, missingSupabaseEnvMessage } from "@/lib/supabase/env"
import type { Guest, InvitationLanguage, InvitationSettings } from "@/lib/types"

const fallbackPreviewGuest: Guest = {
  id: "preview-guest",
  name: "Contoh Tamu Keluarga",
  phone: "0812-0000-0000",
  guestFrom: "Keluarga Inti",
  queryParam: "sample-family-guest",
  shift: "1",
  status: "pending",
  sentAt: null,
}

const fallbackSettings: InvitationSettings = {
  baseUrl: "https://acara-keluarga.example.com/invitation",
  openingText:
    "Assalamu'alaikum. Dengan penuh kebahagiaan, kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri acara keluarga kami.",
  closingText: "Terima kasih atas doa dan kehadirannya. Wassalamu'alaikum.",
  openingTextEn:
    "We are delighted to invite you to join our special family celebration. Your presence means a lot to us.",
  closingTextEn: "Thank you for your prayers and presence.",
}

export default function AdminSettingsPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const isSupabaseConfigured = hasSupabasePublicEnv()

  const [userId, setUserId] = useState<string | null>(null)
  const [draftSettings, setDraftSettings] = useState<InvitationSettings>(fallbackSettings)
  const [previewGuest, setPreviewGuest] = useState<Guest>(fallbackPreviewGuest)
  const [previewLanguage, setPreviewLanguage] = useState<InvitationLanguage>("id")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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
      const [settings, guests] = await Promise.all([
        ensureInvitationSettings(supabase, nextUserId),
        fetchGuests(supabase, nextUserId),
      ])

      setUserId(nextUserId)
      setDraftSettings(settings)
      setPreviewGuest(guests[0] ?? fallbackPreviewGuest)
    } catch (error) {
      if (error instanceof Error && error.message === AUTH_REQUIRED_ERROR) {
        router.replace("/login")
        return
      }

      setErrorMessage("Pengaturan undangan belum bisa dimuat.")
    } finally {
      setIsLoading(false)
    }
  }, [isSupabaseConfigured, router, supabase])

  useEffect(() => {
    void loadPageData()
  }, [loadPageData])

  const previewMessage = useMemo(
    () => buildInvitationMessage(draftSettings, previewGuest, previewLanguage),
    [draftSettings, previewGuest, previewLanguage]
  )

  const handleSave = async () => {
    if (!userId) return

    setIsSaving(true)

    try {
      const nextSettings = await upsertInvitationSettings(supabase, userId, draftSettings)
      setDraftSettings(nextSettings)
      toast.success("Pengaturan undangan berhasil disimpan")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Pengaturan belum bisa disimpan."
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AppShell size="xl">
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <MobileHeader
          title="Pengaturan Undangan"
          subtitle="Atur link undangan dan template pesan default."
          navItems={protectedNavItems}
          action={<SignOutButton />}
        />

        {isLoading ? (
          <Card className="rounded-2xl border border-border/80 bg-white py-0 shadow-none">
            <CardContent className="flex items-center gap-2 px-4 py-5 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin text-[#2f6f44]" />
              Memuat pengaturan...
            </CardContent>
          </Card>
        ) : errorMessage ? (
          <EmptyState
            icon={InboxIcon}
            title="Pengaturan belum bisa dimuat"
            description={errorMessage}
            actionLabel="Coba Lagi"
            onAction={() => {
              void loadPageData()
            }}
          />
        ) : (
          <SettingsForm
            settings={draftSettings}
            onChange={setDraftSettings}
            onSave={handleSave}
            previewGuestName={previewGuest.name}
            previewMessage={previewMessage}
            previewLanguage={previewLanguage}
            onPreviewLanguageChange={setPreviewLanguage}
            isSaving={isSaving}
          />
        )}
      </div>
    </AppShell>
  )
}

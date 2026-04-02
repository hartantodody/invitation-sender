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
import { getSupabaseErrorMessage } from "@/lib/supabase/error"
import type {
  Guest,
  InvitationLanguage,
  InvitationMessageTemplate,
  InvitationSettings,
} from "@/lib/types"

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
  templates: [
    {
      id: "fallback-id",
      languageCode: "id",
      languageLabel: "Indonesia",
      openingText:
        "Assalamu'alaikum. Dengan penuh kebahagiaan, kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri acara keluarga kami.",
      closingText: "Terima kasih atas doa dan kehadirannya. Wassalamu'alaikum.",
    },
    {
      id: "fallback-en",
      languageCode: "en",
      languageLabel: "English",
      openingText:
        "We are delighted to invite you to join our special family celebration. Your presence means a lot to us.",
      closingText: "Thank you for your prayers and presence.",
    },
  ],
}

function resolvePreviewLanguage(settings: InvitationSettings, currentLanguage: string | null) {
  const fallbackLanguage = settings.templates[0]?.languageCode ?? "id"

  if (!currentLanguage) return fallbackLanguage
  if (settings.templates.some((template) => template.languageCode === currentLanguage)) {
    return currentLanguage
  }

  return fallbackLanguage
}

function buildNextLanguageCode(templates: InvitationMessageTemplate[]) {
  const usedCodes = new Set(templates.map((template) => template.languageCode))
  let index = 1

  while (usedCodes.has(`lang-${index}`)) {
    index += 1
  }

  return `lang-${index}`
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
      setPreviewLanguage((currentLanguage) => resolvePreviewLanguage(settings, currentLanguage))
    } catch (error) {
      if (error instanceof Error && error.message === AUTH_REQUIRED_ERROR) {
        router.replace("/login")
        return
      }

      setErrorMessage(getSupabaseErrorMessage(error, "Pengaturan undangan belum bisa dimuat."))
    } finally {
      setIsLoading(false)
    }
  }, [isSupabaseConfigured, router, supabase])

  useEffect(() => {
    void loadPageData()
  }, [loadPageData])

  useEffect(() => {
    setPreviewLanguage((currentLanguage) => resolvePreviewLanguage(draftSettings, currentLanguage))
  }, [draftSettings])

  const previewMessage = useMemo(
    () => buildInvitationMessage(draftSettings, previewGuest, previewLanguage),
    [draftSettings, previewGuest, previewLanguage]
  )

  const handleTemplateChange = (
    index: number,
    patch: Partial<Pick<InvitationMessageTemplate, "languageCode" | "languageLabel" | "openingText" | "closingText">>
  ) => {
    setDraftSettings((currentSettings) => ({
      ...currentSettings,
      templates: currentSettings.templates.map((template, templateIndex) =>
        templateIndex === index
          ? {
              ...template,
              ...patch,
            }
          : template
      ),
    }))
  }

  const handleAddLanguage = () => {
    const nextLanguageCode = buildNextLanguageCode(draftSettings.templates)
    const nextTemplate: InvitationMessageTemplate = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      languageCode: nextLanguageCode,
      languageLabel: "Bahasa Baru",
      openingText: "",
      closingText: "",
    }

    setDraftSettings((currentSettings) => ({
      ...currentSettings,
      templates: [...currentSettings.templates, nextTemplate],
    }))
    setPreviewLanguage(nextLanguageCode)
  }

  const handleRemoveLanguage = (index: number) => {
    setDraftSettings((currentSettings) => {
      if (currentSettings.templates.length <= 1) return currentSettings

      const removedTemplate = currentSettings.templates[index]
      const nextTemplates = currentSettings.templates.filter((_, templateIndex) => templateIndex !== index)

      if (removedTemplate && previewLanguage === removedTemplate.languageCode) {
        setPreviewLanguage(nextTemplates[0]?.languageCode ?? "id")
      }

      return {
        ...currentSettings,
        templates: nextTemplates,
      }
    })
  }

  const handleSave = async () => {
    if (!userId) return

    setIsSaving(true)

    try {
      const nextSettings = await upsertInvitationSettings(supabase, userId, draftSettings)
      setDraftSettings(nextSettings)
      setPreviewLanguage((currentLanguage) => resolvePreviewLanguage(nextSettings, currentLanguage))
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
            onTemplateChange={handleTemplateChange}
            onAddLanguage={handleAddLanguage}
            onRemoveLanguage={handleRemoveLanguage}
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

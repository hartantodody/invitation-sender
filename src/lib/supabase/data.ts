import type { SupabaseClient } from "@supabase/supabase-js"

import type {
  Guest,
  GuestFormInput,
  GuestRow,
  GuestShift,
  GuestStatus,
  InvitationMessageTemplate,
  InvitationMessageTemplateRow,
  InvitationSettings,
  InvitationSettingsRow,
} from "@/lib/types"
import { buildGuestQueryParam } from "@/lib/invitation-utils"

export const AUTH_REQUIRED_ERROR = "AUTH_REQUIRED"
export type GuestStatusFilter = "all" | GuestStatus

type FetchGuestsPageParams = {
  userId: string
  page: number
  pageSize: number
  searchQuery?: string
  status?: GuestStatusFilter
  statusIn?: GuestStatus[]
  shiftIn?: GuestShift[]
  guestFrom?: string | null
  guestFromIn?: string[]
}

type GuestsPageResult = {
  guests: Guest[]
  totalCount: number
}

type GuestStats = {
  total: number
  sent: number
  pending: number
}

const SETTINGS_COLUMNS = "id,user_id,base_url,created_at,updated_at"
const TEMPLATE_COLUMNS =
  "id,user_id,language_code,language_label,opening_text,closing_text,created_at,updated_at"
const GUEST_COLUMNS =
  "id,user_id,name,phone,guest_from,query_param,shift,status,sent_at,notes,created_at,updated_at"

const defaultInvitationBaseUrl = "https://acara-keluarga.example.com/invitation"
const defaultTemplates: Array<Omit<InvitationMessageTemplate, "id">> = [
  {
    languageCode: "id",
    languageLabel: "Indonesia",
    openingText:
      "Assalamu'alaikum. Dengan penuh kebahagiaan, kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri acara keluarga kami.",
    closingText: "Terima kasih atas doa dan kehadirannya. Wassalamu'alaikum.",
  },
  {
    languageCode: "en",
    languageLabel: "English",
    openingText:
      "We are delighted to invite you to join our special family celebration. Your presence means a lot to us.",
    closingText: "Thank you for your prayers and presence.",
  },
]

function mapGuestRow(row: GuestRow): Guest {
  const shift = row.shift ? String(row.shift) : "1"

  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? null,
    guestFrom: row.guest_from,
    queryParam: row.query_param,
    shift: shift as Guest["shift"],
    status: row.status,
    sentAt: row.sent_at,
    notes: row.notes ?? undefined,
  }
}

function mapTemplateRow(row: InvitationMessageTemplateRow): InvitationMessageTemplate {
  return {
    id: row.id,
    languageCode: row.language_code,
    languageLabel: row.language_label,
    openingText: row.opening_text,
    closingText: row.closing_text,
  }
}

function normalizeLanguageCode(languageCode: string) {
  return languageCode.trim().toLowerCase().replace(/[^a-z0-9-]/g, "")
}

function normalizeTemplateInput(templates: InvitationSettings["templates"]) {
  const normalizedTemplates = templates.map((template, index) => {
    const normalizedLanguageCode = normalizeLanguageCode(template.languageCode)
    const normalizedLanguageLabel = template.languageLabel.trim()

    return {
      index,
      language_code: normalizedLanguageCode,
      language_label: normalizedLanguageLabel || `Bahasa ${index + 1}`,
      opening_text: template.openingText.trim(),
      closing_text: template.closingText.trim(),
    }
  })

  if (normalizedTemplates.length === 0) {
    throw new Error("Minimal harus ada 1 template bahasa.")
  }

  const codeSet = new Set<string>()
  normalizedTemplates.forEach((template) => {
    if (!template.language_code) {
      throw new Error("Kode bahasa tidak boleh kosong.")
    }
    if (!template.opening_text || !template.closing_text) {
      throw new Error(`Template bahasa "${template.language_label}" belum lengkap.`)
    }
    if (codeSet.has(template.language_code)) {
      throw new Error(`Kode bahasa "${template.language_code}" duplikat.`)
    }
    codeSet.add(template.language_code)
  })

  return normalizedTemplates
}

function sanitizeSearchTerm(value: string) {
  return value.trim().replace(/[(),]/g, " ").replace(/\s+/g, " ")
}

function mapInvitationSettings(
  row: Pick<InvitationSettingsRow, "base_url">,
  templates: InvitationMessageTemplate[]
): InvitationSettings {
  return {
    baseUrl: row.base_url,
    templates,
  }
}

function normalizeGuestFormValues(values: GuestFormInput, usedQueryParams?: Set<string>) {
  const normalizedName = values.name.trim()
  const baseQueryParam = buildGuestQueryParam(normalizedName) || "guest"
  let queryParam = baseQueryParam

  if (usedQueryParams) {
    let suffix = 2
    while (usedQueryParams.has(queryParam)) {
      queryParam = `${baseQueryParam}+${suffix}`
      suffix += 1
    }
    usedQueryParams.add(queryParam)
  }

  return {
    name: normalizedName,
    phone: values.phone.trim() || null,
    guest_from: values.guestFrom.trim(),
    query_param: queryParam,
    shift: Number(values.shift) as GuestRow["shift"],
    notes: values.notes.trim() || null,
  }
}

export async function getAuthenticatedUserId(supabase: SupabaseClient) {
  const { data, error } = await supabase.auth.getUser()

  if (error) throw error
  if (!data.user?.id) throw new Error(AUTH_REQUIRED_ERROR)

  return data.user.id
}

export async function ensureInvitationSettings(
  supabase: SupabaseClient,
  userId: string
): Promise<InvitationSettings> {
  const { data: settingsRow, error } = await supabase
    .from("invitation_settings")
    .select(SETTINGS_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle<InvitationSettingsRow>()

  if (error) throw error

  let ensuredSettings = settingsRow

  if (!ensuredSettings) {
    const { data: insertedData, error: insertError } = await supabase
      .from("invitation_settings")
      .insert({
        user_id: userId,
        base_url: defaultInvitationBaseUrl,
      })
      .select(SETTINGS_COLUMNS)
      .single<InvitationSettingsRow>()

    if (insertError) throw insertError
    ensuredSettings = insertedData
  }

  const { data: initialTemplateRows, error: fetchTemplatesError } = await supabase
    .from("invitation_message_templates")
    .select(TEMPLATE_COLUMNS)
    .eq("user_id", userId)
    .order("language_label", { ascending: true })
    .returns<InvitationMessageTemplateRow[]>()

  if (fetchTemplatesError) throw fetchTemplatesError

  let templateRows = initialTemplateRows

  if ((templateRows ?? []).length === 0) {
    const { data: legacySettings, error: legacyError } = await supabase
      .from("invitation_settings")
      .select("opening_text,closing_text,opening_text_en,closing_text_en")
      .eq("user_id", userId)
      .maybeSingle<{
        opening_text?: string | null
        closing_text?: string | null
        opening_text_en?: string | null
        closing_text_en?: string | null
      }>()

    const canUseLegacyValues =
      !legacyError &&
      Boolean(legacySettings?.opening_text?.trim() && legacySettings?.closing_text?.trim())

    const seedTemplates = canUseLegacyValues
      ? [
          {
            user_id: userId,
            language_code: "id",
            language_label: "Indonesia",
            opening_text: legacySettings?.opening_text?.trim() || defaultTemplates[0].openingText,
            closing_text: legacySettings?.closing_text?.trim() || defaultTemplates[0].closingText,
          },
          {
            user_id: userId,
            language_code: "en",
            language_label: "English",
            opening_text:
              legacySettings?.opening_text_en?.trim() ||
              legacySettings?.opening_text?.trim() ||
              defaultTemplates[1].openingText,
            closing_text:
              legacySettings?.closing_text_en?.trim() ||
              legacySettings?.closing_text?.trim() ||
              defaultTemplates[1].closingText,
          },
        ]
      : defaultTemplates.map((template) => ({
          user_id: userId,
          language_code: template.languageCode,
          language_label: template.languageLabel,
          opening_text: template.openingText,
          closing_text: template.closingText,
        }))

    const { error: seedError } = await supabase
      .from("invitation_message_templates")
      .upsert(seedTemplates, {
        onConflict: "user_id,language_code",
      })

    if (seedError) throw seedError

    const { data: seededRows, error: seededRowsError } = await supabase
      .from("invitation_message_templates")
      .select(TEMPLATE_COLUMNS)
      .eq("user_id", userId)
      .order("language_label", { ascending: true })
      .returns<InvitationMessageTemplateRow[]>()

    if (seededRowsError) throw seededRowsError
    templateRows = seededRows
  }

  return mapInvitationSettings(ensuredSettings, (templateRows ?? []).map(mapTemplateRow))
}

export async function upsertInvitationSettings(
  supabase: SupabaseClient,
  userId: string,
  settings: InvitationSettings
): Promise<InvitationSettings> {
  const normalizedTemplates = normalizeTemplateInput(settings.templates)

  const { data: savedSettings, error } = await supabase
    .from("invitation_settings")
    .upsert(
      {
        user_id: userId,
        base_url: settings.baseUrl.trim(),
      },
      {
        onConflict: "user_id",
      }
    )
    .select(SETTINGS_COLUMNS)
    .single<InvitationSettingsRow>()

  if (error) throw error

  const { data: existingTemplateCodes, error: existingTemplateCodesError } = await supabase
    .from("invitation_message_templates")
    .select("language_code")
    .eq("user_id", userId)
    .returns<Array<Pick<InvitationMessageTemplateRow, "language_code">>>()

  if (existingTemplateCodesError) throw existingTemplateCodesError

  const nextTemplateCodes = new Set(normalizedTemplates.map((template) => template.language_code))
  const templateCodesToDelete = (existingTemplateCodes ?? [])
    .map((template) => template.language_code)
    .filter((languageCode) => !nextTemplateCodes.has(languageCode))

  if (templateCodesToDelete.length > 0) {
    const { error: deleteTemplatesError } = await supabase
      .from("invitation_message_templates")
      .delete()
      .eq("user_id", userId)
      .in("language_code", templateCodesToDelete)

    if (deleteTemplatesError) throw deleteTemplatesError
  }

  const { error: saveTemplatesError } = await supabase
    .from("invitation_message_templates")
    .upsert(
      normalizedTemplates.map((template) => ({
        user_id: userId,
        language_code: template.language_code,
        language_label: template.language_label,
        opening_text: template.opening_text,
        closing_text: template.closing_text,
      })),
      {
        onConflict: "user_id,language_code",
      }
    )

  if (saveTemplatesError) throw saveTemplatesError

  const { data: savedTemplates, error: savedTemplatesError } = await supabase
    .from("invitation_message_templates")
    .select(TEMPLATE_COLUMNS)
    .eq("user_id", userId)
    .order("language_label", { ascending: true })
    .returns<InvitationMessageTemplateRow[]>()

  if (savedTemplatesError) throw savedTemplatesError

  return mapInvitationSettings(savedSettings, (savedTemplates ?? []).map(mapTemplateRow))
}

export async function fetchGuests(supabase: SupabaseClient, userId: string): Promise<Guest[]> {
  const { data, error } = await supabase
    .from("guests")
    .select(GUEST_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<GuestRow[]>()

  if (error) throw error

  return (data ?? []).map(mapGuestRow)
}

export async function fetchGuestsPage(
  supabase: SupabaseClient,
  params: FetchGuestsPageParams
): Promise<GuestsPageResult> {
  const safePage = Math.max(1, params.page)
  const safePageSize = Math.min(Math.max(1, params.pageSize), 100)
  const from = (safePage - 1) * safePageSize
  const to = from + safePageSize - 1
  const normalizedSearchTerm = sanitizeSearchTerm(params.searchQuery ?? "")
  const normalizedStatusIn = Array.from(new Set(params.statusIn ?? [])).filter(
    (status): status is GuestStatus => status === "pending" || status === "sent"
  )
  const normalizedShiftIn = Array.from(new Set(params.shiftIn ?? [])).filter(
    (shift): shift is GuestShift => shift === "1" || shift === "2" || shift === "3"
  )
  const normalizedGuestFromIn = Array.from(
    new Set((params.guestFromIn ?? []).map((guestFrom) => guestFrom.trim()).filter(Boolean))
  )
  const normalizedGuestFrom = (params.guestFrom ?? "").trim()

  let query = supabase
    .from("guests")
    .select(GUEST_COLUMNS, { count: "exact" })
    .eq("user_id", params.userId)

  if (normalizedStatusIn.length > 0) {
    query = query.in("status", normalizedStatusIn)
  } else if (params.status && params.status !== "all") {
    query = query.eq("status", params.status)
  }

  if (normalizedShiftIn.length > 0) {
    query = query.in(
      "shift",
      normalizedShiftIn.map((shift) => Number(shift) as GuestRow["shift"])
    )
  }

  if (normalizedGuestFromIn.length > 0) {
    query = query.in("guest_from", normalizedGuestFromIn)
  } else if (normalizedGuestFrom) {
    query = query.eq("guest_from", normalizedGuestFrom)
  }

  if (normalizedSearchTerm) {
    const pattern = `%${normalizedSearchTerm}%`
    query = query.or(
      `name.ilike.${pattern},phone.ilike.${pattern},guest_from.ilike.${pattern},query_param.ilike.${pattern}`
    )
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to)
    .returns<GuestRow[]>()

  if (error) throw error

  return {
    guests: (data ?? []).map(mapGuestRow),
    totalCount: count ?? 0,
  }
}

export async function fetchGuestStats(
  supabase: SupabaseClient,
  userId: string
): Promise<GuestStats> {
  const [totalResult, sentResult] = await Promise.all([
    supabase.from("guests").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase
      .from("guests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "sent"),
  ])

  if (totalResult.error) throw totalResult.error
  if (sentResult.error) throw sentResult.error

  const total = totalResult.count ?? 0
  const sent = sentResult.count ?? 0

  return {
    total,
    sent,
    pending: Math.max(total - sent, 0),
  }
}

export async function fetchGuestFromOptions(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from("guests")
    .select("guest_from")
    .eq("user_id", userId)
    .order("guest_from", { ascending: true })
    .returns<Array<Pick<GuestRow, "guest_from">>>()

  if (error) throw error

  return Array.from(
    new Set((data ?? []).map((row) => row.guest_from.trim()).filter(Boolean))
  )
}

export async function createGuest(
  supabase: SupabaseClient,
  userId: string,
  values: GuestFormInput
): Promise<Guest> {
  const payload = normalizeGuestFormValues(values)

  const { data, error } = await supabase
    .from("guests")
    .insert({
      user_id: userId,
      ...payload,
      status: "pending",
      sent_at: null,
    })
    .select(GUEST_COLUMNS)
    .single<GuestRow>()

  if (error) throw error

  return mapGuestRow(data)
}

export async function createGuestsBulk(
  supabase: SupabaseClient,
  userId: string,
  values: GuestFormInput[]
): Promise<Guest[]> {
  if (values.length === 0) return []

  const { data: existingRows, error: existingError } = await supabase
    .from("guests")
    .select("query_param")
    .eq("user_id", userId)
    .returns<Array<Pick<GuestRow, "query_param">>>()

  if (existingError) throw existingError

  const usedQueryParams = new Set((existingRows ?? []).map((row) => row.query_param))
  const payload = values.map((value) => normalizeGuestFormValues(value, usedQueryParams))

  const { data, error } = await supabase
    .from("guests")
    .insert(
      payload.map((item) => ({
        user_id: userId,
        ...item,
        status: "pending",
        sent_at: null,
      }))
    )
    .select(GUEST_COLUMNS)
    .returns<GuestRow[]>()

  if (error) throw error

  return (data ?? []).map(mapGuestRow)
}

export async function updateGuestById(
  supabase: SupabaseClient,
  userId: string,
  guestId: string,
  values: GuestFormInput
): Promise<Guest> {
  const payload = normalizeGuestFormValues(values)

  const { data, error } = await supabase
    .from("guests")
    .update(payload)
    .eq("id", guestId)
    .eq("user_id", userId)
    .select(GUEST_COLUMNS)
    .single<GuestRow>()

  if (error) throw error

  return mapGuestRow(data)
}

export async function deleteGuestById(
  supabase: SupabaseClient,
  userId: string,
  guestId: string
): Promise<void> {
  const { error } = await supabase
    .from("guests")
    .delete()
    .eq("id", guestId)
    .eq("user_id", userId)

  if (error) throw error
}

export async function markGuestAsSent(
  supabase: SupabaseClient,
  userId: string,
  guestId: string
): Promise<Guest> {
  const { data, error } = await supabase
    .from("guests")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
    })
    .eq("id", guestId)
    .eq("user_id", userId)
    .select(GUEST_COLUMNS)
    .single<GuestRow>()

  if (error) throw error

  return mapGuestRow(data)
}

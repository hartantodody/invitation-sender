import type { SupabaseClient } from "@supabase/supabase-js"

import type {
  Guest,
  GuestFormInput,
  GuestRow,
  InvitationSettings,
  InvitationSettingsRow,
} from "@/lib/types"
import { buildGuestQueryParam } from "@/lib/invitation-utils"

export const AUTH_REQUIRED_ERROR = "AUTH_REQUIRED"

const SETTINGS_COLUMNS = "id,user_id,base_url,opening_text,closing_text,created_at,updated_at"
const GUEST_COLUMNS = "id,user_id,name,phone,query_param,shift,status,sent_at,notes,created_at,updated_at"

const defaultInvitationSettings: InvitationSettings = {
  baseUrl: "https://acara-keluarga.example.com/invitation",
  openingText:
    "Assalamu'alaikum. Dengan penuh kebahagiaan, kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri acara keluarga kami.",
  closingText: "Terima kasih atas doa dan kehadirannya. Wassalamu'alaikum.",
}

function mapSettingsRow(row: InvitationSettingsRow): InvitationSettings {
  return {
    baseUrl: row.base_url,
    openingText: row.opening_text,
    closingText: row.closing_text,
  }
}

function mapGuestRow(row: GuestRow): Guest {
  const shift = row.shift ? String(row.shift) : "1"

  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    queryParam: row.query_param,
    shift: shift as Guest["shift"],
    status: row.status,
    sentAt: row.sent_at,
    notes: row.notes ?? undefined,
  }
}

function normalizeGuestFormValues(values: GuestFormInput) {
  const normalizedName = values.name.trim()
  const queryParam = buildGuestQueryParam(normalizedName) || "guest"

  return {
    name: normalizedName,
    phone: values.phone.trim(),
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
  const { data, error } = await supabase
    .from("invitation_settings")
    .select(SETTINGS_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle<InvitationSettingsRow>()

  if (error) throw error
  if (data) return mapSettingsRow(data)

  const { data: insertedData, error: insertError } = await supabase
    .from("invitation_settings")
    .insert({
      user_id: userId,
      base_url: defaultInvitationSettings.baseUrl,
      opening_text: defaultInvitationSettings.openingText,
      closing_text: defaultInvitationSettings.closingText,
    })
    .select(SETTINGS_COLUMNS)
    .single<InvitationSettingsRow>()

  if (insertError) throw insertError

  return mapSettingsRow(insertedData)
}

export async function upsertInvitationSettings(
  supabase: SupabaseClient,
  userId: string,
  settings: InvitationSettings
): Promise<InvitationSettings> {
  const { data, error } = await supabase
    .from("invitation_settings")
    .upsert(
      {
        user_id: userId,
        base_url: settings.baseUrl.trim(),
        opening_text: settings.openingText.trim(),
        closing_text: settings.closingText.trim(),
      },
      {
        onConflict: "user_id",
      }
    )
    .select(SETTINGS_COLUMNS)
    .single<InvitationSettingsRow>()

  if (error) throw error

  return mapSettingsRow(data)
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

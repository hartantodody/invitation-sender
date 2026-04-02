export type InvitationSettings = {
  baseUrl: string
  openingText: string
  closingText: string
  openingTextEn: string
  closingTextEn: string
}

export type GuestStatus = "pending" | "sent"
export type GuestShift = "1" | "2" | "3"
export type InvitationLanguage = "id" | "en"

export type Guest = {
  id: string
  name: string
  phone: string
  guestFrom: string
  queryParam: string
  shift: GuestShift
  status: GuestStatus
  sentAt: string | null
  notes?: string
}

export type GuestFormInput = {
  name: string
  phone: string
  guestFrom: string
  shift: GuestShift
  notes: string
}

export type InvitationSettingsRow = {
  id: string
  user_id: string
  base_url: string
  opening_text: string
  closing_text: string
  opening_text_en: string
  closing_text_en: string
  created_at: string
  updated_at: string
}

export type GuestRow = {
  id: string
  user_id: string
  name: string
  phone: string
  guest_from: string
  query_param: string
  shift: 1 | 2 | 3
  status: GuestStatus
  sent_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

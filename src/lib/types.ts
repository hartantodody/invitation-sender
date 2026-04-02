export type GuestStatus = "pending" | "sent"
export type GuestShift = "1" | "2" | "3"
export type InvitationLanguage = string

export type InvitationMessageTemplate = {
  id: string
  languageCode: string
  languageLabel: string
  openingText: string
  closingText: string
}

export type InvitationSettings = {
  baseUrl: string
  templates: InvitationMessageTemplate[]
}

export type Guest = {
  id: string
  name: string
  phone: string | null
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
  created_at: string
  updated_at: string
}

export type InvitationMessageTemplateRow = {
  id: string
  user_id: string
  language_code: string
  language_label: string
  opening_text: string
  closing_text: string
  created_at: string
  updated_at: string
}

export type GuestRow = {
  id: string
  user_id: string
  name: string
  phone: string | null
  guest_from: string
  query_param: string
  shift: 1 | 2 | 3
  status: GuestStatus
  sent_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

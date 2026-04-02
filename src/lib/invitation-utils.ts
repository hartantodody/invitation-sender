import type { Guest, InvitationLanguage, InvitationSettings } from "@/lib/types"

export function buildGuestQueryParam(name: string): string {
  return name
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export function buildInvitationUrl(
  baseUrl: string,
  queryParam: string,
  shift: Guest["shift"],
  language: InvitationLanguage = "id"
): string {
  const trimmedBaseUrl = baseUrl.trim()
  const trimmedQueryParam = queryParam.trim()

  if (!trimmedBaseUrl) return ""
  if (!trimmedQueryParam) return trimmedBaseUrl

  try {
    const url = new URL(trimmedBaseUrl)
    url.searchParams.set("lang", language)
    url.searchParams.set("to", trimmedQueryParam)
    url.searchParams.set("shift", shift)
    return url.toString()
  } catch {
    const params = new URLSearchParams({
      lang: language,
      to: trimmedQueryParam,
      shift,
    })
    const separator = trimmedBaseUrl.includes("?") ? "&" : "?"
    return `${trimmedBaseUrl}${separator}${params.toString()}`
  }
}

export function buildInvitationMessage(
  settings: InvitationSettings,
  guest: Pick<Guest, "queryParam" | "shift">,
  language: InvitationLanguage = "id"
): string {
  const openingText =
    language === "en" ? settings.openingTextEn.trim() || settings.openingText.trim() : settings.openingText.trim()
  const closingText =
    language === "en" ? settings.closingTextEn.trim() || settings.closingText.trim() : settings.closingText.trim()
  const invitationUrl = buildInvitationUrl(settings.baseUrl, guest.queryParam, guest.shift, language)

  return [openingText, invitationUrl, closingText]
    .filter(Boolean)
    .join("\n\n")
}

export function formatPhoneForWhatsApp(phone: string | null | undefined): string {
  const digitsOnly = (phone ?? "").replace(/\D/g, "")

  if (!digitsOnly) return ""
  if (digitsOnly.startsWith("62")) return digitsOnly
  if (digitsOnly.startsWith("0")) return `62${digitsOnly.slice(1)}`
  if (digitsOnly.startsWith("8")) return `62${digitsOnly}`

  return digitsOnly
}

export function buildWhatsAppUrl(phone: string | null | undefined, message: string): string {
  const formattedPhone = formatPhoneForWhatsApp(phone)
  const encodedMessage = encodeURIComponent(message)

  if (!formattedPhone) {
    return `https://wa.me/?text=${encodedMessage}`
  }

  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Intentionally continue to fallback method.
  }

  if (typeof document === "undefined") return false

  try {
    const textArea = document.createElement("textarea")
    textArea.value = text
    textArea.setAttribute("readonly", "")
    textArea.style.position = "absolute"
    textArea.style.left = "-9999px"
    document.body.appendChild(textArea)
    textArea.select()
    const successful = document.execCommand("copy")
    document.body.removeChild(textArea)
    return successful
  } catch {
    return false
  }
}

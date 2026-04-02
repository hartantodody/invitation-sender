export function getSupabaseErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof Error) {
    const normalized = error.message.toLowerCase()

    const isMissingColumnError =
      (normalized.includes("column") && normalized.includes("does not exist")) ||
      normalized.includes("could not find") ||
      normalized.includes("schema cache")

    if (isMissingColumnError) {
      return "Schema Supabase belum versi terbaru. Jalankan ulang SQL migration terbaru (kolom: guest_from + tabel invitation_message_templates)."
    }

    return error.message
  }

  return fallbackMessage
}

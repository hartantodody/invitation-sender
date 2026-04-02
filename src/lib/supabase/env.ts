export const missingSupabaseEnvMessage =
  "Variabel env Supabase belum lengkap. Wajib ada: NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY (atau NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)."

const fallbackUrl = "https://missing-project-ref.supabase.co"
const fallbackKey = "missing-supabase-publishable-key"

export function hasSupabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  return Boolean(url && publishableKey)
}

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  const hasRequiredEnv = Boolean(url && publishableKey)

  if (!hasRequiredEnv && process.env.NODE_ENV !== "production") {
    console.warn(missingSupabaseEnvMessage)
  }

  return {
    url: url || fallbackUrl,
    publishableKey: publishableKey || fallbackKey,
    hasRequiredEnv,
  }
}

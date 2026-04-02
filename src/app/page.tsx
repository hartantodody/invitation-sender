import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { hasSupabasePublicEnv } from "@/lib/supabase/env"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  if (!hasSupabasePublicEnv()) {
    redirect("/login")
  }

  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()

  if (data.user) {
    redirect("/send")
  }

  redirect("/login")
}

import { redirect } from "next/navigation"

import { LoginForm } from "@/components/login-form"
import { hasSupabasePublicEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"

export default async function LoginPage() {
  if (hasSupabasePublicEnv()) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()

    if (data.user) {
      redirect("/send")
    }
  }

  return <LoginForm />
}

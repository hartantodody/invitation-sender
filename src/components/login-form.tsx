"use client"

import { type FormEvent, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { AppShell } from "@/components/app-shell"
import { MobileHeader } from "@/components/mobile-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { hasSupabasePublicEnv, missingSupabaseEnvMessage } from "@/lib/supabase/env"

export function LoginForm() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const isSupabaseConfigured = hasSupabasePublicEnv()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(() =>
    isSupabaseConfigured ? null : missingSupabaseEnvMessage
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!isSupabaseConfigured) {
      setErrorMessage(missingSupabaseEnvMessage)
      return
    }

    setErrorMessage(null)
    setIsSubmitting(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    setIsSubmitting(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    router.replace("/send")
    router.refresh()
  }

  return (
    <AppShell size="xl" className="flex min-h-screen items-center py-8 sm:py-10">
      <div className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
        <div className="hidden rounded-3xl border border-border/80 bg-[#edf4ee] p-7 lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-3">
            <p className="inline-flex rounded-full border border-border/70 bg-white px-3 py-1 text-xs font-medium text-muted-foreground">
              Pengirim Undangan
            </p>
            <h2 className="text-3xl font-semibold leading-tight text-foreground">
              Kirim undangan keluarga lebih cepat dan rapi.
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Login dulu, lalu kamu bisa kelola tamu, atur template pesan, dan kirim WhatsApp dari satu alur sederhana.
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-white px-4 py-3 text-sm text-muted-foreground">
            <p>Flow utama:</p>
            <p>1) Pilih tamu</p>
            <p>2) Copy pesan</p>
            <p>3) Buka WhatsApp</p>
            <p>4) Tandai terkirim</p>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md space-y-5">
          <MobileHeader
            title="Pengirim Undangan"
            subtitle="Masuk dengan akun admin Supabase kamu."
          />

          <Card className="rounded-2xl border border-border/80 bg-white py-0 shadow-none">
            <CardContent className="space-y-4 px-4 py-5">
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-11 rounded-xl bg-white"
                    placeholder="family-admin@example.com"
                    required
                    disabled={isSubmitting || !isSupabaseConfigured}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-11 rounded-xl bg-white"
                    placeholder="********"
                    required
                    disabled={isSubmitting || !isSupabaseConfigured}
                  />
                </div>

                {errorMessage ? (
                  <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {errorMessage}
                  </p>
                ) : null}

                <Button
                  type="submit"
                  className="h-11 w-full rounded-xl bg-[#2f6f44] hover:bg-[#2a663e]"
                  disabled={isSubmitting || !isSupabaseConfigured}
                >
                  {isSubmitting ? "Sedang masuk..." : "Masuk"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}

"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { LogOutIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

export function SignOutButton() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    const { error } = await supabase.auth.signOut()
    setIsSigningOut(false)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success("Berhasil keluar")
    router.replace("/login")
    router.refresh()
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-9 rounded-xl bg-white"
      onClick={handleSignOut}
      disabled={isSigningOut}
    >
      <LogOutIcon className="size-3.5" />
      {isSigningOut ? "Keluar..." : "Keluar"}
    </Button>
  )
}

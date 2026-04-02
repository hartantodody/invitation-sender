import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { getSupabaseEnv } from "@/lib/supabase/env"

function isProtectedPath(pathname: string) {
  return pathname === "/send" || pathname.startsWith("/admin")
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const { url, publishableKey, hasRequiredEnv } = getSupabaseEnv()

  if (!hasRequiredEnv) {
    return supabaseResponse
  }

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const { data } = await supabase.auth.getClaims()
  const user = data?.claims
  const pathname = request.nextUrl.pathname

  if (!user && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/send"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { createSupabaseAdminClient } from "@/lib/supabase/server"
import { assertSupabaseClientEnv } from "@/lib/supabase/shared"

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request,
  })
  const { url, anonKey } = assertSupabaseClientEnv()

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value)
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (request.nextUrl.pathname.startsWith("/admin")) {
    const adminClient = createSupabaseAdminClient()
    const { data: profile } = await adminClient.from("profiles").select("id, email, role").eq("id", user.id).maybeSingle()

    if (profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }

  return response
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
}

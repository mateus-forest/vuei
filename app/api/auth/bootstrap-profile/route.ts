import { NextResponse } from "next/server"
import { INITIAL_BONUS_CREDITS } from "@/lib/services/credit-service"
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server"

type BootstrapProfilePayload = {
  name?: string
  phone?: string
}

export async function POST(request: Request) {
  let body: BootstrapProfilePayload = {}

  try {
    body = (await request.json()) as BootstrapProfilePayload
  } catch {
    body = {}
  }

  try {
    const sessionClient = await createSupabaseServerClient()
    const {
      data: { user },
      error: userError,
    } = await sessionClient.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createSupabaseAdminClient()
    const { data: existingProfile, error: existingProfileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()

    if (existingProfile && !existingProfileError) {
      return NextResponse.json({ ok: true, data: { profileId: existingProfile.id } })
    }

    const minimalPayload = {
      id: user.id,
      email: user.email ?? "",
      credits: INITIAL_BONUS_CREDITS,
      role: "user",
    }

    const { data, error } = await supabase.from("profiles").upsert(minimalPayload, { onConflict: "id" }).select("id").single()

    if (error || !data) {
      console.error("PROFILE INSERT ERROR:", {
        message: error?.message,
        details: error?.details,
      })

      return NextResponse.json(
        {
          ok: false,
          error: "Não foi possível preparar o perfil do usuário.",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ ok: true, data: { profileId: data.id } })
  } catch (error) {
    console.error("PROFILE INSERT ERROR:", {
      message: error instanceof Error ? error.message : String(error),
      details: null,
    })

    return NextResponse.json(
      {
        ok: false,
        error: "Não foi possível preparar o perfil do usuário.",
      },
      { status: 500 },
    )
  }
}

import { NextResponse } from "next/server"
import { createSupabaseAdminClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getSupabaseHost() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    return url ? new URL(url).host : null
  } catch {
    return null
  }
}

export async function GET() {
  const supabase = createSupabaseAdminClient()

  const tableQuery = await supabase.from("support_tickets").select("id").limit(1)
  const rpcQuery = await supabase.rpc("support_tickets_debug_check")

  return NextResponse.json({
    ok: true,
    data: {
      runtime,
      schema: "public",
      supabaseUrlHost: getSupabaseHost(),
      serviceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      tableSelect: {
        ok: !tableQuery.error,
        data: tableQuery.data ?? null,
        error: tableQuery.error
          ? {
              message: tableQuery.error.message,
              code: tableQuery.error.code,
              details: tableQuery.error.details,
              hint: tableQuery.error.hint,
            }
          : null,
      },
      rpcDebugCheck: {
        ok: !rpcQuery.error,
        data: rpcQuery.data ?? null,
        error: rpcQuery.error
          ? {
              message: rpcQuery.error.message,
              code: rpcQuery.error.code,
              details: rpcQuery.error.details,
              hint: rpcQuery.error.hint,
            }
          : null,
      },
    },
  })
}

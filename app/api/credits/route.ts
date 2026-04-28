import { NextResponse } from "next/server"
import { getCreditPolicy } from "@/lib/services/credit-service"

export async function GET() {
  return NextResponse.json({
    freeTier: {
      searches: 1,
      loginRequiredAfter: 1,
    },
    ...getCreditPolicy(),
  })
}

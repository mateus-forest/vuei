import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/services/server-session-service"
import { listUserTravelHistory } from "@/lib/services/search-service"

export async function GET() {
  const session = await getServerSession()
  return NextResponse.json(await listUserTravelHistory(session?.userId))
}

import { NextResponse } from "next/server"
import { getStripePriceConfigSummary } from "@/lib/services/billing-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function maskSecret(value: string | undefined) {
  if (!value) {
    return null
  }

  if (value.length <= 8) {
    return `${value.slice(0, 2)}***`
  }

  return `${value.slice(0, 4)}***${value.slice(-4)}`
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    data: {
      runtime,
      stripeSecretKeyConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
      stripeWebhookSecretConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      stripeSecretKeyPreview: maskSecret(process.env.STRIPE_SECRET_KEY),
      stripeWebhookSecretPreview: maskSecret(process.env.STRIPE_WEBHOOK_SECRET),
      packs: getStripePriceConfigSummary().map((item) => ({
        plan: item.plan,
        credits: item.credits,
        priceEnvKey: item.priceEnvKey,
        configured: item.configured,
        priceIdPreview: maskSecret(item.priceId),
      })),
    },
  })
}

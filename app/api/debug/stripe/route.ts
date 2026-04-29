import { NextResponse } from "next/server"
import { getStripeServerClient } from "@/lib/stripe/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type StripeLikeError = {
  message?: string
  type?: string
  code?: string
  param?: string
  name?: string
}

function getKeyPrefix(secretKey: string | undefined) {
  if (!secretKey) {
    return "missing"
  }

  if (secretKey.startsWith("sk_test")) {
    return "sk_test"
  }

  if (secretKey.startsWith("sk_live")) {
    return "sk_live"
  }

  return "other"
}

function getPricePrefix(priceId: string | undefined) {
  if (!priceId) {
    return "missing"
  }

  if (priceId.startsWith("price_")) {
    return "price"
  }

  return "other"
}

export async function GET() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  const priceId = process.env.STRIPE_PRICE_ID_PACK_5
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""

  console.log("STRIPE DEBUG RUNTIME", runtime)
  console.log("STRIPE DEBUG SECRET CONFIGURED", Boolean(secretKey))
  console.log("STRIPE DEBUG PRICE ID", priceId ?? null)
  console.log("STRIPE DEBUG APP URL", appUrl)

  let retrieveResult: Record<string, unknown>

  try {
    if (!priceId) {
      retrieveResult = {
        ok: false,
        error: "STRIPE_PRICE_ID_PACK_5_MISSING",
      }
    } else {
      const stripe = getStripeServerClient()
      const price = await stripe.prices.retrieve(priceId)

      retrieveResult = {
        ok: true,
        id: price.id,
        active: price.active,
        currency: price.currency,
        type: price.type,
        unit_amount: price.unit_amount,
      }
    }
  } catch (error) {
    const stripeError = error as StripeLikeError

    console.error("STRIPE DEBUG ERROR", {
      runtime,
      stripeSecretConfigured: Boolean(secretKey),
      priceId,
      message: stripeError?.message,
      type: stripeError?.type,
      code: stripeError?.code,
      param: stripeError?.param,
      name: stripeError?.name,
    })

    retrieveResult = {
      ok: false,
      message: stripeError?.message ?? "Unknown Stripe error",
      type: stripeError?.type ?? null,
      code: stripeError?.code ?? null,
      param: stripeError?.param ?? null,
      name: stripeError?.name ?? null,
    }
  }

  return NextResponse.json({
    ok: true,
    data: {
      nodeVersion: process.version,
      runtime,
      stripeSecretKeyConfigured: Boolean(secretKey),
      stripeSecretKeyPrefix: getKeyPrefix(secretKey),
      stripePricePack5Configured: Boolean(priceId),
      stripePricePack5Prefix: getPricePrefix(priceId),
      nextPublicAppUrl: appUrl,
      priceRetrieve: retrieveResult,
    },
  })
}

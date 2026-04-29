import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function summarizeBody(body: string) {
  if (body.length <= 800) {
    return body
  }

  return `${body.slice(0, 800)}...`
}

export async function GET() {
  const priceId = process.env.STRIPE_PRICE_ID_PACK_5
  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!priceId || !secretKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "Stripe envs ausentes para teste de rede.",
        stripePriceIdConfigured: Boolean(priceId),
        stripeSecretConfigured: Boolean(secretKey),
      },
      { status: 500 },
    )
  }

  const url = `https://api.stripe.com/v1/prices/${priceId}`

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
      cache: "no-store",
    })

    const bodyText = await response.text()

    return NextResponse.json({
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      body: summarizeBody(bodyText),
    })
  } catch (error) {
    const networkError = error as {
      name?: string
      message?: string
      cause?: unknown
      stack?: string
    }

    console.error("NETWORK STRIPE DEBUG ERROR", {
      name: networkError?.name,
      message: networkError?.message,
      cause: networkError?.cause,
      stack: networkError?.stack,
    })

    return NextResponse.json(
      {
        ok: false,
        error: {
          name: networkError?.name ?? null,
          message: networkError?.message ?? "Unknown network error",
          cause: networkError?.cause ?? null,
          stack: networkError?.stack ?? null,
        },
      },
      { status: 500 },
    )
  }
}

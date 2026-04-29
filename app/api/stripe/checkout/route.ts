import { NextResponse } from "next/server"
import { z } from "zod"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getStripeServerClient } from "@/lib/stripe/server"
import { getAppBaseUrl, getStripePlanConfig } from "@/lib/services/billing-service"

const payloadSchema = z.object({
  plan: z.string().min(1),
})

type StripeLikeError = {
  message?: string
  type?: string
  code?: string
  param?: string
  name?: string
}

function jsonOk(data: unknown, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init)
}

function jsonError(error: string, code: string, status: number, detail?: string) {
  return NextResponse.json({ ok: false, error, code, detail }, { status })
}

function isStripeConnectionError(error: StripeLikeError | null | undefined) {
  const name = error?.name ?? ""
  const type = error?.type ?? ""
  const code = error?.code ?? ""
  const message = error?.message ?? ""

  return (
    name === "StripeConnectionError" ||
    type === "StripeConnectionError" ||
    code === "StripeConnectionError" ||
    message.includes("connection to Stripe")
  )
}

export async function POST(request: Request) {
  let json: unknown

  try {
    json = await request.json()
  } catch (error) {
    console.error("CHECKOUT ERROR", error)
    return jsonError("Os dados enviados para checkout são inválidos.", "INVALID_JSON", 400)
  }

  const parsed = payloadSchema.safeParse(json)

  if (!parsed.success) {
    return jsonError("Os dados enviados para checkout são inválidos.", "INVALID_PAYLOAD", 400, parsed.error.message)
  }

  const planId = parsed.data.plan
  const plan = getStripePlanConfig(planId)
  const hasStripeSecretKey = Boolean(process.env.STRIPE_SECRET_KEY)
  const appUrl = getAppBaseUrl()

  console.log("CHECKOUT PLAN", planId)
  console.log("CHECKOUT PRICE ID", plan?.priceId ?? null)
  console.log("CHECKOUT STRIPE SECRET CONFIGURED", hasStripeSecretKey)
  console.log("CHECKOUT APP URL", appUrl)

  if (!plan || !plan.priceId) {
    return jsonError("Pacote de créditos ainda não configurado.", "INVALID_PLAN", 400)
  }

  if (!hasStripeSecretKey) {
    return jsonError("Checkout ainda não configurado.", "STRIPE_SECRET_MISSING", 500)
  }

  if (!appUrl) {
    return jsonError("Checkout ainda não configurado.", "APP_URL_MISSING", 500)
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return jsonError("Faça login para comprar créditos.", "AUTH_REQUIRED", 401)
  }

  try {
    const stripe = getStripeServerClient()

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${appUrl}/dashboard?checkout=success`,
      cancel_url: `${appUrl}/dashboard?checkout=cancel`,
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      customer_email: user.email ?? undefined,
      metadata: {
        userId: user.id,
        email: user.email ?? "",
        plan: plan.id,
        credits: String(plan.credits),
      },
    })

    if (!session.url) {
      return jsonError("Não foi possível iniciar o checkout agora.", "CHECKOUT_URL_MISSING", 500)
    }

    return jsonOk({ url: session.url, fallback: false })
  } catch (error) {
    const stripeError = error as StripeLikeError

    console.error("CHECKOUT ERROR", {
      message: stripeError?.message,
      type: stripeError?.type,
      code: stripeError?.code,
      param: stripeError?.param,
      name: stripeError?.name,
    })

    if (isStripeConnectionError(stripeError)) {
      console.log("CHECKOUT PAYMENT LINK FALLBACK", plan.paymentLink || null)

      if (plan.paymentLink) {
        return jsonOk({ url: plan.paymentLink, fallback: true })
      }

      return jsonError("Pacote de créditos ainda não configurado.", "PAYMENT_LINK_FALLBACK_MISSING", 500)
    }

    return jsonError("Não foi possível iniciar o checkout agora.", "STRIPE_CHECKOUT_FAILED", 500)
  }
}

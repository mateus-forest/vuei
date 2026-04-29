import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createSupabaseAdminClient } from "@/lib/supabase/server"
import { assertStripeWebhookSecret, getStripeServerClient } from "@/lib/stripe/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type SupabaseLikeError = {
  message?: string
  code?: string
  details?: string
  hint?: string
}

function jsonOk(data: unknown, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init)
}

function jsonError(error: string, status: number, detail?: string) {
  return NextResponse.json({ ok: false, error, detail }, { status })
}

function logSupabaseError(label: string, error: SupabaseLikeError | null | undefined) {
  console.error(label, {
    message: error?.message,
    code: error?.code,
    details: error?.details,
    hint: error?.hint,
  })
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return jsonError("Missing Stripe signature.", 400)
  }

  let event: Stripe.Event

  try {
    const body = await request.text()
    const stripe = getStripeServerClient()
    const webhookSecret = assertStripeWebhookSecret()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    console.error("STRIPE WEBHOOK SIGNATURE ERROR:", error)
    return jsonError("Invalid Stripe signature.", 400)
  }

  console.log("WEBHOOK EVENT TYPE:", event.type)

  if (event.type !== "checkout.session.completed") {
    return jsonOk({ received: true, ignored: true })
  }

  const session = event.data.object as Stripe.Checkout.Session
  const metadata = session.metadata ?? {}
  const stripeSessionId = session.id
  const stripePaymentIntent =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null
  const amountCents = session.amount_total ?? 0
  const status = session.payment_status ?? session.status ?? "paid"
  const email = metadata.email ?? session.customer_details?.email ?? session.customer_email ?? null
  const plan = metadata.plan ?? null
  const credits = Number(metadata.credits ?? 0)

  console.log("WEBHOOK SESSION METADATA:", metadata)
  console.log("WEBHOOK SESSION ID:", session.id)
  console.log("WEBHOOK CUSTOMER EMAIL:", session.customer_details?.email ?? session.customer_email ?? null)

  if (!stripeSessionId) {
    return jsonOk({ received: true, ignored: true })
  }

  const supabase = createSupabaseAdminClient()
  let resolvedUserId = metadata.userId ?? null

  if ((!resolvedUserId || resolvedUserId === "null") && email) {
    const { data: profileByEmail, error: profileByEmailError } = await supabase
      .from("profiles")
      .select("id,email,credits")
      .eq("email", email)
      .maybeSingle()

    if (profileByEmailError) {
      logSupabaseError("STRIPE WEBHOOK PROFILE EMAIL LOOKUP ERROR:", profileByEmailError)
      return jsonError("Failed to resolve user profile by email.", 500)
    }

    resolvedUserId = profileByEmail?.id ?? null
  }

  const { data: existingPayment, error: existingPaymentError } = await supabase
    .from("payments")
    .select("id")
    .eq("stripe_session_id", stripeSessionId)
    .maybeSingle()

  if (existingPaymentError) {
    logSupabaseError("STRIPE WEBHOOK PAYMENT LOOKUP ERROR:", existingPaymentError)
    return jsonError("Failed to lookup payment.", 500)
  }

  let paymentId = existingPayment?.id ?? null

  if (!paymentId) {
    const { data: insertedPayment, error: paymentInsertError } = await supabase
      .from("payments")
      .insert({
        id: randomUUID(),
        user_id: resolvedUserId,
        email,
        stripe_session_id: stripeSessionId,
        stripe_payment_intent: stripePaymentIntent,
        amount_cents: amountCents,
        currency: session.currency ?? "brl",
        status: "paid",
        plan,
        credits,
      })
      .select("id")
      .single()

    if (paymentInsertError || !insertedPayment) {
      logSupabaseError("STRIPE WEBHOOK PAYMENT INSERT ERROR:", paymentInsertError)
      return jsonError("Failed to persist payment.", 500)
    }

    paymentId = insertedPayment.id
  }

  const { data: existingTransaction, error: existingTransactionError } = await supabase
    .from("credit_transactions")
    .select("id")
    .eq("payment_id", paymentId)
    .maybeSingle()

  if (existingTransactionError) {
    logSupabaseError("STRIPE WEBHOOK TRANSACTION LOOKUP ERROR:", existingTransactionError)
    return jsonError("Failed to lookup credit transaction.", 500)
  }

  if (existingTransaction) {
    return jsonOk({ received: true, alreadyProcessed: true })
  }

  if (!resolvedUserId && email) {
    const { data: profileByEmail, error: retryProfileLookupError } = await supabase
      .from("profiles")
      .select("id,email,credits")
      .eq("email", email)
      .maybeSingle()

    if (retryProfileLookupError) {
      logSupabaseError("STRIPE WEBHOOK PROFILE RETRY LOOKUP ERROR:", retryProfileLookupError)
      return jsonError("Failed to resolve user profile for credit update.", 500)
    }

    resolvedUserId = profileByEmail?.id ?? null
  }

  if (!resolvedUserId) {
    return jsonError("Failed to resolve user profile for credit update.", 500)
  }

  const { data: profile, error: profileLookupError } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", resolvedUserId)
    .maybeSingle()

  if (profileLookupError) {
    logSupabaseError("STRIPE WEBHOOK PROFILE LOOKUP ERROR:", profileLookupError)
    return jsonError("Failed to lookup profile credits.", 500)
  }

  if (!profile) {
    return jsonError("Failed to resolve user profile for credit update.", 500)
  }

  const currentCredits = typeof profile.credits === "number" ? profile.credits : 0

  const { error: profileUpdateError } = await supabase
    .from("profiles")
    .update({
      credits: currentCredits + credits,
    })
    .eq("id", resolvedUserId)

  if (profileUpdateError) {
    logSupabaseError("STRIPE WEBHOOK PROFILE UPDATE ERROR:", profileUpdateError)
    return jsonError("Failed to update profile credits.", 500)
  }

  const { error: transactionInsertError } = await supabase.from("credit_transactions").insert({
    id: randomUUID(),
    user_id: resolvedUserId,
    email,
    type: "purchase",
    credits,
    description: `Compra de créditos (${plan ?? "plano desconhecido"})`,
    payment_id: paymentId,
  })

  if (transactionInsertError) {
    logSupabaseError("STRIPE WEBHOOK TRANSACTION INSERT ERROR:", transactionInsertError)
    return jsonError("Failed to persist credit transaction.", 500)
  }

  return jsonOk({ received: true, processed: true, paymentId, userId: resolvedUserId })
}

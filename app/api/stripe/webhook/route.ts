import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createSupabaseAdminClient } from "@/lib/supabase/server"
import { assertStripeWebhookSecret, getStripeServerClient } from "@/lib/stripe/server"

function jsonOk(data: unknown, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init)
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json({ ok: false, error: "Missing Stripe signature." }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    const body = await request.text()
    const stripe = getStripeServerClient()
    const webhookSecret = assertStripeWebhookSecret()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    console.error("STRIPE WEBHOOK SIGNATURE ERROR:", error)
    return NextResponse.json({ ok: false, error: "Invalid Stripe signature." }, { status: 400 })
  }

  if (event.type !== "checkout.session.completed") {
    return jsonOk({ received: true, ignored: true })
  }

  const session = event.data.object as Stripe.Checkout.Session
  const metadata = session.metadata ?? {}
  const userId = metadata.userId ?? null
  const email = metadata.email ?? session.customer_details?.email ?? null
  const plan = metadata.plan ?? null
  const credits = Number(metadata.credits ?? 0)
  const stripeSessionId = session.id
  const stripePaymentIntent =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null
  const amountCents = session.amount_total ?? 0
  const status = session.payment_status ?? session.status ?? "paid"

  if (!stripeSessionId) {
    return jsonOk({ received: true, ignored: true })
  }

  const supabase = createSupabaseAdminClient()

  const { data: existingPayment, error: existingPaymentError } = await supabase
    .from("payments")
    .select("id")
    .eq("stripe_session_id", stripeSessionId)
    .maybeSingle()

  if (existingPaymentError) {
    console.error("STRIPE WEBHOOK PAYMENT LOOKUP ERROR:", existingPaymentError)
  }

  let paymentId = existingPayment?.id ?? null

  if (!paymentId) {
    const { data: insertedPayment, error: paymentInsertError } = await supabase
      .from("payments")
      .insert({
        id: randomUUID(),
        user_id: userId,
        email,
        stripe_session_id: stripeSessionId,
        stripe_payment_intent: stripePaymentIntent,
        amount_cents: amountCents,
        currency: session.currency ?? "brl",
        status,
        plan,
        credits,
      })
      .select("id")
      .single()

    if (paymentInsertError || !insertedPayment) {
      console.error("STRIPE WEBHOOK PAYMENT INSERT ERROR:", paymentInsertError)
      return NextResponse.json({ ok: false, error: "Failed to persist payment." }, { status: 500 })
    }

    paymentId = insertedPayment.id
  }

  const { data: existingTransaction, error: existingTransactionError } = await supabase
    .from("credit_transactions")
    .select("id")
    .eq("payment_id", paymentId)
    .maybeSingle()

  if (existingTransactionError) {
    console.error("STRIPE WEBHOOK TRANSACTION LOOKUP ERROR:", existingTransactionError)
  }

  if (!existingTransaction) {
    const { error: transactionInsertError } = await supabase.from("credit_transactions").insert({
      id: randomUUID(),
      user_id: userId,
      email,
      type: "purchase",
      credits,
      description: `Compra de créditos (${plan ?? "plano desconhecido"})`,
      payment_id: paymentId,
    })

    if (transactionInsertError) {
      console.error("STRIPE WEBHOOK TRANSACTION INSERT ERROR:", transactionInsertError)
      return NextResponse.json({ ok: false, error: "Failed to persist credit transaction." }, { status: 500 })
    }

    if (userId && credits > 0) {
      const { data: profile } = await supabase.from("profiles").select("credits").eq("id", userId).maybeSingle()
      const currentCredits = typeof profile?.credits === "number" ? profile.credits : 0

      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({
          credits: currentCredits + credits,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)

      if (profileUpdateError) {
        console.error("STRIPE WEBHOOK PROFILE UPDATE ERROR:", profileUpdateError)
        return NextResponse.json({ ok: false, error: "Failed to update profile credits." }, { status: 500 })
      }
    }
  }

  return jsonOk({ received: true })
}

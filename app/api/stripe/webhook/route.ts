import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createSupabaseAdminClient } from "@/lib/supabase/server"
import { assertStripeWebhookSecret, getStripeServerClient } from "@/lib/stripe/server"
import { resolveStripeCreditsPackage } from "@/lib/services/billing-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type SupabaseLikeError = {
  message?: string
  code?: string
  details?: string
  hint?: string
}

type ResolvedUserContext = {
  userId: string | null
  email: string | null
  source: "metadata.user_id" | "client_reference_id" | "metadata.email" | "customer_email" | "not_found"
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

function getCheckoutSessionEmail(session: Stripe.Checkout.Session) {
  return session.metadata?.email ?? session.customer_details?.email ?? session.customer_email ?? null
}

async function getSessionPriceId(stripe: Stripe, session: Stripe.Checkout.Session) {
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 10 })
  return lineItems.data[0]?.price?.id ?? null
}

async function resolveUserContext({
  supabase,
  session,
}: {
  supabase: ReturnType<typeof createSupabaseAdminClient>
  session: Stripe.Checkout.Session
}): Promise<ResolvedUserContext> {
  const metadataUserId = session.metadata?.user_id ?? null
  const clientReferenceId = session.client_reference_id ?? null
  const metadataEmail = session.metadata?.email ?? null
  const customerEmail = session.customer_email ?? session.customer_details?.email ?? null

  const userIdCandidates: Array<{ value: string | null; source: ResolvedUserContext["source"] }> = [
    { value: metadataUserId, source: "metadata.user_id" },
    { value: clientReferenceId, source: "client_reference_id" },
  ]

  for (const candidate of userIdCandidates) {
    if (!candidate.value) {
      continue
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id,email")
      .eq("id", candidate.value)
      .maybeSingle()

    if (profileError) {
      logSupabaseError("STRIPE_WEBHOOK_ERROR", profileError)
      throw new Error("Failed to resolve user profile by id.")
    }

    if (profile?.id) {
      return {
        userId: profile.id,
        email: profile.email ?? metadataEmail ?? customerEmail,
        source: candidate.source,
      }
    }

    const authLookup = await supabase.auth.admin.getUserById(candidate.value)
    if (!authLookup.error && authLookup.data.user) {
      return {
        userId: authLookup.data.user.id,
        email: authLookup.data.user.email ?? metadataEmail ?? customerEmail,
        source: candidate.source,
      }
    }
  }

  const emailCandidates: Array<{ value: string | null; source: ResolvedUserContext["source"] }> = [
    { value: metadataEmail, source: "metadata.email" },
    { value: customerEmail, source: "customer_email" },
  ]

  for (const candidate of emailCandidates) {
    if (!candidate.value) {
      continue
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id,email")
      .eq("email", candidate.value)
      .maybeSingle()

    if (profileError) {
      logSupabaseError("STRIPE_WEBHOOK_ERROR", profileError)
      throw new Error("Failed to resolve user profile by email.")
    }

    if (profile?.id) {
      return {
        userId: profile.id,
        email: profile.email ?? candidate.value,
        source: candidate.source,
      }
    }
  }

  return {
    userId: null,
    email: metadataEmail ?? customerEmail,
    source: "not_found",
  }
}

async function ensureProfileExists({
  supabase,
  userId,
  email,
}: {
  supabase: ReturnType<typeof createSupabaseAdminClient>
  userId: string
  email: string | null
}) {
  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle()

  if (existingProfileError) {
    logSupabaseError("STRIPE_WEBHOOK_ERROR", existingProfileError)
    throw new Error("Failed to lookup profile.")
  }

  if (existingProfile) {
    return
  }

  const { error: profileUpsertError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email: email ?? "",
      credits: 0,
      role: "user",
    },
    { onConflict: "id" },
  )

  if (profileUpsertError) {
    logSupabaseError("STRIPE_WEBHOOK_ERROR", profileUpsertError)
    throw new Error("Failed to create missing profile.")
  }
}

function buildPurchaseDescription(credits: number) {
  return `Compra de ${credits} créditos`
}

export async function POST(req: Request) {
  console.log("STRIPE_WEBHOOK_POST_RECEIVED", {
    method: req.method,
    url: req.url,
  })

  try {
    const signature = req.headers.get("stripe-signature")

    if (!signature) {
      console.error("STRIPE_WEBHOOK_ERROR", { reason: "missing_signature" })
      return jsonError("Missing Stripe signature.", 400)
    }

    const body = await req.text()
    const stripe = getStripeServerClient()
    const webhookSecret = assertStripeWebhookSecret()

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (error) {
      console.error("STRIPE_WEBHOOK_ERROR", {
        reason: "invalid_signature",
        message: error instanceof Error ? error.message : String(error),
      })
      return jsonError("Invalid Stripe signature.", 400)
    }

    console.log("STRIPE_WEBHOOK_EVENT_TYPE", {
      eventId: event.id,
      eventType: event.type,
    })

    if (event.type !== "checkout.session.completed") {
      return jsonOk({ received: true, ignored: true, eventType: event.type })
    }

    const session = event.data.object as Stripe.Checkout.Session
    const stripeSessionId = session.id
    const paymentStatus = session.payment_status ?? session.status ?? null
    const stripePaymentIntent =
      typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null
    const amountCents = session.amount_total ?? 0
    const sessionEmail = getCheckoutSessionEmail(session)

    console.log("STRIPE_WEBHOOK_SESSION_COMPLETED", {
      eventId: event.id,
      stripeSessionId,
      paymentStatus,
      metadata: session.metadata ?? null,
    })

    if (!stripeSessionId) {
      return jsonOk({ received: true, ignored: true, reason: "missing_session_id" })
    }

    if (paymentStatus !== "paid") {
      return jsonOk({ received: true, ignored: true, reason: "payment_not_confirmed" })
    }

    let priceId: string | null = null

    try {
      priceId = await getSessionPriceId(stripe, session)
    } catch (error) {
      console.error("STRIPE_WEBHOOK_ERROR", {
        reason: "line_items_lookup_failed",
        stripeSessionId,
        message: error instanceof Error ? error.message : String(error),
      })
    }

    const resolvedPackage = resolveStripeCreditsPackage({
      credits: session.metadata?.credits ?? null,
      plan: session.metadata?.plan ?? null,
      priceId,
    })

    if (!resolvedPackage) {
      return jsonOk({ received: true, ignored: true, reason: "invalid_package_mapping" })
    }

    const supabase = createSupabaseAdminClient()

    let resolvedUser: ResolvedUserContext
    try {
      resolvedUser = await resolveUserContext({ supabase, session })
    } catch (error) {
      console.error("STRIPE_WEBHOOK_ERROR", {
        reason: "user_resolution_failed",
        stripeSessionId,
        message: error instanceof Error ? error.message : String(error),
      })
      return jsonError("Failed to resolve Stripe checkout user.", 500)
    }

    const { data: existingPayment, error: existingPaymentError } = await supabase
      .from("payments")
      .select("id,status,credits_applied")
      .eq("stripe_session_id", stripeSessionId)
      .maybeSingle()

    if (existingPaymentError) {
      logSupabaseError("STRIPE_WEBHOOK_ERROR", existingPaymentError)
      return jsonError("Failed to lookup payment.", 500)
    }

    if (existingPayment?.credits_applied && ["paid", "completed"].includes(existingPayment.status ?? "")) {
      return jsonOk({ received: true, alreadyProcessed: true, paymentId: existingPayment.id })
    }

    const paymentPayload = {
      id: existingPayment?.id ?? randomUUID(),
      user_id: resolvedUser.userId,
      email: resolvedUser.email ?? sessionEmail,
      stripe_session_id: stripeSessionId,
      stripe_payment_intent: stripePaymentIntent,
      amount_cents: amountCents,
      currency: session.currency ?? "brl",
      status: "paid",
      plan: resolvedPackage.planId,
      credits: resolvedPackage.credits,
    }

    const { data: payment, error: paymentUpsertError } = await supabase
      .from("payments")
      .upsert(paymentPayload, { onConflict: "stripe_session_id" })
      .select("id,status,credits_applied")
      .single()

    if (paymentUpsertError || !payment) {
      logSupabaseError("STRIPE_WEBHOOK_ERROR", paymentUpsertError)
      return jsonError("Failed to persist payment.", 500)
    }

    if (!resolvedUser.userId) {
      return jsonOk({
        received: true,
        processed: false,
        reason: "user_not_found",
        paymentId: payment.id,
        stripeSessionId,
      })
    }

    try {
      await ensureProfileExists({
        supabase,
        userId: resolvedUser.userId,
        email: resolvedUser.email ?? sessionEmail,
      })
    } catch (error) {
      console.error("STRIPE_WEBHOOK_ERROR", {
        reason: "profile_prepare_failed",
        stripeSessionId,
        message: error instanceof Error ? error.message : String(error),
      })
      return jsonError("Failed to prepare profile for credit update.", 500)
    }

    const description = buildPurchaseDescription(resolvedPackage.credits)
    const { data: rpcResult, error: rpcError } = await supabase.rpc("apply_stripe_credit_purchase", {
      p_payment_id: payment.id,
      p_user_id: resolvedUser.userId,
      p_credits: resolvedPackage.credits,
      p_email: resolvedUser.email ?? sessionEmail,
      p_description: description,
    })

    if (rpcError) {
      logSupabaseError("STRIPE_WEBHOOK_ERROR", rpcError)
      return jsonError("Failed to apply purchased credits.", 500)
    }

    const applyResult = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult

    return jsonOk({
      received: true,
      processed: true,
      paymentId: payment.id,
      userId: resolvedUser.userId,
      stripeSessionId,
      plan: resolvedPackage.planId,
      credits: resolvedPackage.credits,
      applyResult: applyResult ?? null,
    })
  } catch (error) {
    console.error("STRIPE_WEBHOOK_ERROR", {
      reason: "unhandled_exception",
      message: error instanceof Error ? error.message : String(error),
    })
    return jsonError("Unexpected Stripe webhook error.", 500)
  }
}

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
      logSupabaseError("STRIPE WEBHOOK PROFILE ID LOOKUP ERROR:", profileError)
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
      logSupabaseError("STRIPE WEBHOOK PROFILE EMAIL LOOKUP ERROR:", profileError)
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
    logSupabaseError("STRIPE WEBHOOK PROFILE EXISTENCE ERROR:", existingProfileError)
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
    logSupabaseError("STRIPE WEBHOOK PROFILE UPSERT ERROR:", profileUpsertError)
    throw new Error("Failed to create missing profile.")
  }
}

function buildPurchaseDescription(credits: number) {
  return `Compra de ${credits} crÃ©ditos`
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return jsonError("Missing Stripe signature.", 400)
  }

  const body = await request.text()
  let event: Stripe.Event

  try {
    const stripe = getStripeServerClient()
    const webhookSecret = assertStripeWebhookSecret()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    console.error("STRIPE WEBHOOK SIGNATURE ERROR:", error)
    return jsonError("Invalid Stripe signature.", 400)
  }

  if (event.type !== "checkout.session.completed") {
    console.log("STRIPE WEBHOOK IGNORED EVENT", { eventId: event.id, eventType: event.type })
    return jsonOk({ received: true, ignored: true, eventType: event.type })
  }

  const stripe = getStripeServerClient()
  const session = event.data.object as Stripe.Checkout.Session
  const stripeSessionId = session.id
  const paymentStatus = session.payment_status ?? session.status ?? null
  const stripePaymentIntent =
    typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null
  const amountCents = session.amount_total ?? 0
  const sessionEmail = getCheckoutSessionEmail(session)

  console.log("STRIPE WEBHOOK RECEIVED", {
    eventId: event.id,
    eventType: event.type,
    stripeSessionId,
    paymentStatus,
    metadata: session.metadata ?? null,
  })

  if (!stripeSessionId) {
    return jsonOk({ received: true, ignored: true, reason: "missing_session_id" })
  }

  if (paymentStatus !== "paid") {
    console.log("STRIPE WEBHOOK PAYMENT NOT PAID", { stripeSessionId, paymentStatus })
    return jsonOk({ received: true, ignored: true, reason: "payment_not_confirmed" })
  }

  let priceId: string | null = null

  try {
    priceId = await getSessionPriceId(stripe, session)
  } catch (error) {
    console.error("STRIPE WEBHOOK LINE ITEMS ERROR", {
      stripeSessionId,
      message: error instanceof Error ? error.message : String(error),
    })
  }

  const resolvedPackage = resolveStripeCreditsPackage({
    credits: session.metadata?.credits ?? null,
    plan: session.metadata?.plan ?? null,
    priceId,
  })

  console.log("STRIPE WEBHOOK PACKAGE", {
    stripeSessionId,
    metadataPlan: session.metadata?.plan ?? null,
    metadataCredits: session.metadata?.credits ?? null,
    priceId,
    resolvedPlan: resolvedPackage?.planId ?? null,
    resolvedCredits: resolvedPackage?.credits ?? null,
    resolutionSource: resolvedPackage?.source ?? null,
  })

  if (!resolvedPackage) {
    return jsonOk({ received: true, ignored: true, reason: "invalid_package_mapping" })
  }

  const supabase = createSupabaseAdminClient()
  let resolvedUser: ResolvedUserContext

  try {
    resolvedUser = await resolveUserContext({ supabase, session })
  } catch (error) {
    console.error("STRIPE WEBHOOK USER RESOLUTION ERROR", {
      stripeSessionId,
      message: error instanceof Error ? error.message : String(error),
    })
    return jsonError("Failed to resolve Stripe checkout user.", 500)
  }

  console.log("STRIPE WEBHOOK USER", {
    stripeSessionId,
    userId: resolvedUser.userId,
    source: resolvedUser.source,
    email: resolvedUser.email,
  })

  const { data: existingPayment, error: existingPaymentError } = await supabase
    .from("payments")
    .select("id,status,credits_applied")
    .eq("stripe_session_id", stripeSessionId)
    .maybeSingle()

  if (existingPaymentError) {
    logSupabaseError("STRIPE WEBHOOK PAYMENT LOOKUP ERROR:", existingPaymentError)
    return jsonError("Failed to lookup payment.", 500)
  }

  if (existingPayment?.credits_applied && ["paid", "completed"].includes(existingPayment.status ?? "")) {
    console.log("STRIPE WEBHOOK IDEMPOTENT HIT", { stripeSessionId, paymentId: existingPayment.id })
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
    logSupabaseError("STRIPE WEBHOOK PAYMENT UPSERT ERROR:", paymentUpsertError)
    return jsonError("Failed to persist payment.", 500)
  }

  if (!resolvedUser.userId) {
    console.error("STRIPE WEBHOOK USER NOT FOUND", {
      stripeSessionId,
      paymentId: payment.id,
      email: resolvedUser.email ?? sessionEmail,
      status: "user_not_found",
    })

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
    return jsonError("Failed to prepare profile for credit update.", 500, error instanceof Error ? error.message : undefined)
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
    logSupabaseError("STRIPE WEBHOOK APPLY CREDITS ERROR:", rpcError)
    return jsonError("Failed to apply purchased credits.", 500)
  }

  const applyResult = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult

  console.log("STRIPE WEBHOOK APPLIED", {
    stripeSessionId,
    paymentId: payment.id,
    userId: resolvedUser.userId,
    plan: resolvedPackage.planId,
    credits: resolvedPackage.credits,
    result: applyResult ?? null,
  })

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
}

import Stripe from "stripe"

const STRIPE_API_VERSION = "2026-04-22.dahlia"

let stripeClient: Stripe | null = null

export function getStripeServerClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!secretKey) {
    throw new Error("Stripe server env vars are missing. Configure STRIPE_SECRET_KEY.")
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: STRIPE_API_VERSION,
    })
  }

  return stripeClient
}

export function assertStripeWebhookSecret() {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    throw new Error("Stripe webhook env vars are missing. Configure STRIPE_WEBHOOK_SECRET.")
  }

  return webhookSecret
}

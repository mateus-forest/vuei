import https from "https"
import Stripe from "stripe"

const agent = new https.Agent({
  keepAlive: true,
  family: 4,
})

const secretKey = process.env.STRIPE_SECRET_KEY

export const stripe = new Stripe(secretKey!, {
  apiVersion: "2025-02-24.acacia" as never,
  httpAgent: agent,
  timeout: 20000,
  maxNetworkRetries: 3,
})

export function getStripeServerClient() {
  if (!secretKey) {
    throw new Error("Stripe server env vars are missing. Configure STRIPE_SECRET_KEY.")
  }

  return stripe
}

export function assertStripeWebhookSecret() {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    throw new Error("Stripe webhook env vars are missing. Configure STRIPE_WEBHOOK_SECRET.")
  }

  return webhookSecret
}

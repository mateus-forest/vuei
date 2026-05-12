import { creditPackages } from "@/lib/constants/credit-packages"
import { getConfiguredAppUrl } from "@/lib/utils/app-url"

export type StripePlanId = "pack_5" | "pack_15" | "pack_30"

type StripePlanConfig = {
  id: StripePlanId
  credits: number
  label: string
  priceEnvKey: string
  paymentLinkEnvKey: string
}

const stripePlanAliases: Record<string, StripePlanId> = {
  "pack-5": "pack_5",
  "pack-15": "pack_15",
  "pack-30": "pack_30",
  pack_5: "pack_5",
  pack_15: "pack_15",
  pack_30: "pack_30",
}

const stripePlanConfigs: Record<StripePlanId, StripePlanConfig> = {
  pack_5: {
    id: "pack_5",
    credits: 5,
    label: "5 crÃ©ditos",
    priceEnvKey: "STRIPE_PRICE_ID_PACK_5",
    paymentLinkEnvKey: "STRIPE_PAYMENT_LINK_PACK_5",
  },
  pack_15: {
    id: "pack_15",
    credits: 15,
    label: "15 crÃ©ditos",
    priceEnvKey: "STRIPE_PRICE_ID_PACK_15",
    paymentLinkEnvKey: "STRIPE_PAYMENT_LINK_PACK_15",
  },
  pack_30: {
    id: "pack_30",
    credits: 30,
    label: "30 crÃ©ditos",
    priceEnvKey: "STRIPE_PRICE_ID_PACK_30",
    paymentLinkEnvKey: "STRIPE_PAYMENT_LINK_PACK_30",
  },
}

export function isStripePlanId(value: string): value is StripePlanId {
  return value in stripePlanConfigs
}

export function normalizeStripePlanId(planId: string | null | undefined): StripePlanId | null {
  if (!planId) {
    return null
  }

  return stripePlanAliases[planId] ?? null
}

export function getStripePlanConfig(planId: string) {
  const normalizedPlanId = normalizeStripePlanId(planId)

  if (!normalizedPlanId || !isStripePlanId(normalizedPlanId)) {
    return null
  }

  const config = stripePlanConfigs[normalizedPlanId]
  const packageData = creditPackages.find((pack) => pack.id === normalizedPlanId)
  const priceId = process.env[config.priceEnvKey]
  const paymentLink = process.env[config.paymentLinkEnvKey]

  return {
    ...config,
    displayPrice: packageData?.price ?? "",
    priceId: priceId ?? "",
    paymentLink: paymentLink ?? "",
  }
}

export function getStripePlanConfigByPriceId(priceId: string | null | undefined) {
  if (!priceId) {
    return null
  }

  const matchingConfig = Object.values(stripePlanConfigs).find((config) => process.env[config.priceEnvKey] === priceId)

  if (!matchingConfig) {
    return null
  }

  return getStripePlanConfig(matchingConfig.id)
}

export function resolveStripeCreditsPackage({
  credits,
  plan,
  priceId,
}: {
  credits?: string | null
  plan?: string | null
  priceId?: string | null
}) {
  const parsedCredits = Number(credits)

  if (Number.isInteger(parsedCredits) && parsedCredits > 0) {
    const planFromCredits = Object.values(stripePlanConfigs).find((config) => config.credits === parsedCredits)
    if (planFromCredits) {
      return { planId: planFromCredits.id, credits: planFromCredits.credits, source: "metadata.credits" as const }
    }
  }

  const configFromPlan = plan ? getStripePlanConfig(plan) : null
  if (configFromPlan) {
    return { planId: configFromPlan.id, credits: configFromPlan.credits, source: "metadata.plan" as const }
  }

  const configFromPriceId = priceId ? getStripePlanConfigByPriceId(priceId) : null
  if (configFromPriceId) {
    return { planId: configFromPriceId.id, credits: configFromPriceId.credits, source: "line_item.price" as const }
  }

  return null
}

export function getStripePriceConfigSummary() {
  return Object.values(stripePlanConfigs).map((config) => {
    const resolved = getStripePlanConfig(config.id)

    return {
      plan: config.id,
      credits: config.credits,
      priceEnvKey: config.priceEnvKey,
      priceId: resolved?.priceId ?? "",
      configured: Boolean(resolved?.priceId),
    }
  })
}

export function getAppBaseUrl() {
  return getConfiguredAppUrl()
}

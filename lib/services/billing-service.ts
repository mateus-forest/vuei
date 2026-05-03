import { creditPackages } from "@/lib/constants/credit-packages"
import { getConfiguredAppUrl } from "@/lib/utils/app-url"

type StripePlanId = "pack-5" | "pack-15" | "pack-30"

type StripePlanConfig = {
  id: StripePlanId
  credits: number
  label: string
  priceEnvKey: string
  paymentLinkEnvKey: string
}

const stripePlanConfigs: Record<StripePlanId, StripePlanConfig> = {
  "pack-5": {
    id: "pack-5",
    credits: 5,
    label: "5 créditos",
    priceEnvKey: "STRIPE_PRICE_ID_PACK_5",
    paymentLinkEnvKey: "STRIPE_PAYMENT_LINK_PACK_5",
  },
  "pack-15": {
    id: "pack-15",
    credits: 15,
    label: "15 créditos",
    priceEnvKey: "STRIPE_PRICE_ID_PACK_15",
    paymentLinkEnvKey: "STRIPE_PAYMENT_LINK_PACK_15",
  },
  "pack-30": {
    id: "pack-30",
    credits: 30,
    label: "30 créditos",
    priceEnvKey: "STRIPE_PRICE_ID_PACK_30",
    paymentLinkEnvKey: "STRIPE_PAYMENT_LINK_PACK_30",
  },
}

export function isStripePlanId(value: string): value is StripePlanId {
  return value in stripePlanConfigs
}

export function getStripePlanConfig(planId: string) {
  if (!isStripePlanId(planId)) {
    return null
  }

  const config = stripePlanConfigs[planId]
  const packageData = creditPackages.find((pack) => pack.id === planId)
  const priceId = process.env[config.priceEnvKey]
  const paymentLink = process.env[config.paymentLinkEnvKey]

  return {
    ...config,
    displayPrice: packageData?.price ?? "",
    priceId: priceId ?? "",
    paymentLink: paymentLink ?? "",
  }
}

export function getAppBaseUrl() {
  return getConfiguredAppUrl()
}

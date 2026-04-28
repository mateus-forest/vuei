import { creditPackages } from "@/lib/constants/credit-packages"

export const INITIAL_BONUS_CREDITS = 3
export const CREDITS_PER_GENERATED_TRIP = 1

export function listCreditPackages() {
  return creditPackages
}

export function getCreditPolicy() {
  return {
    initialBonusCredits: INITIAL_BONUS_CREDITS,
    creditsPerGeneratedTrip: CREDITS_PER_GENERATED_TRIP,
    packages: listCreditPackages(),
  }
}

// TODO: conectar com pagamentos reais e webhooks quando a camada de billing existir.

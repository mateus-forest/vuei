import type { TripProfileInput } from "@/types/trip"

type NullableTripProfileInput = {
  style?: TripProfileInput["style"] | null
  pace?: TripProfileInput["pace"] | null
  preferences?: TripProfileInput["preferences"] | null
  priceSensitivity?: TripProfileInput["priceSensitivity"] | null
  flightPreference?: TripProfileInput["flightPreference"] | null
}

export const defaultTripProfile = {
  style: "geral",
  pace: "equilibrado",
  priceSensitivity: "intermediario",
  preferences: [],
  flightPreference: "nao-importa",
} as const

export function sanitizeTripProfileInput(profile?: NullableTripProfileInput | null): TripProfileInput | undefined {
  if (!profile) return undefined

  const preferences = Array.isArray(profile.preferences) ? profile.preferences.filter(Boolean) : []
  const normalized: TripProfileInput = {
    style: profile.style ?? undefined,
    pace: profile.pace ?? undefined,
    preferences: preferences.length > 0 ? preferences : undefined,
    priceSensitivity: profile.priceSensitivity ?? undefined,
    flightPreference: profile.flightPreference ?? undefined,
  }

  return Object.values(normalized).some(Boolean) ? normalized : undefined
}

export function resolveTripProfileFallback(profile?: NullableTripProfileInput | null) {
  const normalized = sanitizeTripProfileInput(profile)

  return {
    style: normalized?.style ?? defaultTripProfile.style,
    pace: normalized?.pace ?? defaultTripProfile.pace,
    preferences: normalized?.preferences ?? defaultTripProfile.preferences,
    priceSensitivity: normalized?.priceSensitivity ?? defaultTripProfile.priceSensitivity,
    flightPreference: normalized?.flightPreference ?? defaultTripProfile.flightPreference,
  }
}

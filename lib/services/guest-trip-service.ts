"use client"

import type { TripResult } from "@/types/trip"

const LEGACY_GUEST_TRIP_STORAGE_KEY = "guest_trip_generation_used"
const GUEST_TRIP_STORAGE_KEY = "vuei:anonymous-free-generation-used"
const GUEST_TRIP_RESULT_STORAGE_KEY = "vuei:anonymous-trip-result"

type StoredAnonymousTripResult = {
  tripId: string
  source: "busca" | "quiz" | "sugestao"
  result: TripResult
  createdAt: string
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

export function hasUsedGuestTrip() {
  if (!canUseStorage()) {
    return false
  }

  return (
    window.localStorage.getItem(GUEST_TRIP_STORAGE_KEY) === "true" ||
    window.localStorage.getItem(LEGACY_GUEST_TRIP_STORAGE_KEY) === "true"
  )
}

export function markGuestTripUsed() {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(GUEST_TRIP_STORAGE_KEY, "true")
  window.localStorage.setItem(LEGACY_GUEST_TRIP_STORAGE_KEY, "true")
}

export function saveAnonymousTripResult(payload: StoredAnonymousTripResult) {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(GUEST_TRIP_RESULT_STORAGE_KEY, JSON.stringify(payload))
}

export function readAnonymousTripResult() {
  if (!canUseStorage()) {
    return null
  }

  const rawValue = window.localStorage.getItem(GUEST_TRIP_RESULT_STORAGE_KEY)
  if (!rawValue) {
    return null
  }

  try {
    const parsed = JSON.parse(rawValue) as StoredAnonymousTripResult
    if (!parsed?.tripId || !parsed?.result) {
      return null
    }

    return parsed
  } catch (error) {
    console.error("Failed to parse anonymous trip result from storage", error)
    return null
  }
}

export function clearAnonymousTripResult() {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.removeItem(GUEST_TRIP_RESULT_STORAGE_KEY)
}

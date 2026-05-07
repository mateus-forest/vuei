"use client"

const GUEST_TRIP_STORAGE_KEY = "guest_trip_generation_used"

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

export function hasUsedGuestTrip() {
  if (!canUseStorage()) {
    return false
  }

  return window.localStorage.getItem(GUEST_TRIP_STORAGE_KEY) === "true"
}

export function markGuestTripUsed() {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(GUEST_TRIP_STORAGE_KEY, "true")
}

"use client"

import type { QuizAnswer, TripProfileInput } from "@/types/trip"

const PENDING_TRIP_STORAGE_KEY = "pending_trip_generation"
const PENDING_TRIP_MAX_AGE_MS = 1000 * 60 * 60 * 6

type PendingTripBase = {
  redirectTo: string
  createdAt: number
}

export type PendingSearchTripRequest = PendingTripBase & {
  flow: "search"
  payload: {
    origin: "busca" | "sugestao"
    input: string
    profile?: TripProfileInput
  }
}

export type PendingQuizTripRequest = PendingTripBase & {
  flow: "quiz"
  payload: {
    origin: "quiz"
    quizAnswers: QuizAnswer
    travelers?: number
  }
}

export type PendingTripRequest = PendingSearchTripRequest | PendingQuizTripRequest

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined"
}

function isPendingTripRequest(value: unknown): value is PendingTripRequest {
  if (!value || typeof value !== "object") {
    return false
  }

  const candidate = value as Partial<PendingTripRequest>

  if (candidate.flow !== "search" && candidate.flow !== "quiz") {
    return false
  }

  if (typeof candidate.redirectTo !== "string" || typeof candidate.createdAt !== "number") {
    return false
  }

  if (!candidate.payload || typeof candidate.payload !== "object") {
    return false
  }

  if (candidate.flow === "search") {
    return typeof (candidate.payload as PendingSearchTripRequest["payload"]).input === "string"
  }

  return !!(candidate.payload as PendingQuizTripRequest["payload"]).quizAnswers
}

export function savePendingTripRequest(request: Omit<PendingTripRequest, "createdAt">) {
  if (!canUseStorage()) {
    return
  }

  let value: PendingTripRequest

  if (request.flow === "search") {
    const searchRequest = request as Omit<PendingSearchTripRequest, "createdAt">
    value = {
      ...searchRequest,
      createdAt: Date.now(),
    }
  } else {
    const quizRequest = request as Omit<PendingQuizTripRequest, "createdAt">
    value = {
      ...quizRequest,
      createdAt: Date.now(),
    }
  }

  window.sessionStorage.setItem(PENDING_TRIP_STORAGE_KEY, JSON.stringify(value))
}

export function readPendingTripRequest() {
  if (!canUseStorage()) {
    return null
  }

  const rawValue = window.sessionStorage.getItem(PENDING_TRIP_STORAGE_KEY)

  if (!rawValue) {
    return null
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown

    if (!isPendingTripRequest(parsed)) {
      window.sessionStorage.removeItem(PENDING_TRIP_STORAGE_KEY)
      return null
    }

    if (Date.now() - parsed.createdAt > PENDING_TRIP_MAX_AGE_MS) {
      window.sessionStorage.removeItem(PENDING_TRIP_STORAGE_KEY)
      return null
    }

    return parsed
  } catch (error) {
    console.error("Failed to parse pending trip request from storage", error)
    window.sessionStorage.removeItem(PENDING_TRIP_STORAGE_KEY)
    return null
  }
}

export function clearPendingTripRequest() {
  if (!canUseStorage()) {
    return
  }

  window.sessionStorage.removeItem(PENDING_TRIP_STORAGE_KEY)
}

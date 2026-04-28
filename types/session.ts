import type { UserRole } from "@/types/user"

export type SessionRole = UserRole | "guest"

export type AppSession = {
  isAuthenticated: boolean
  role: SessionRole
  userId: string | null
  email: string | null
}

export function isAuthenticatedSession(session: AppSession) {
  return session.isAuthenticated && session.role !== "guest"
}

export type UserRole = "user" | "admin"

export type User = {
  id: string
  name: string
  email: string
  phone: string
  credits: number
  role: UserRole
  status?: "active" | "blocked" | null
  freeSearchUsed: boolean
  planLabel: string
  joinedAt: string
}

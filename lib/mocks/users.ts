import type { User } from "@/types/user"

export const mockUser: User = {
  id: "usr_1",
  name: "Mateus",
  email: "mateus@vuei.app",
  phone: "(54) 99990-2688",
  credits: 3,
  role: "user",
  freeSearchUsed: true,
  planLabel: "Explorador",
  joinedAt: "2026-04-12T12:00:00.000Z",
}

export const mockAdminUser: User = {
  id: "adm_1",
  name: "Mateus",
  email: "admin@vuei.app",
  phone: "(54) 99990-2688",
  credits: 3,
  role: "admin",
  freeSearchUsed: true,
  planLabel: "Administrador",
  joinedAt: "2026-04-10T12:00:00.000Z",
}

export const mockUsers: User[] = [
  mockUser,
  {
    id: "usr_2",
    name: "Aline Costa",
    email: "aline@exemplo.com",
    phone: "(11) 98888-0001",
    credits: 4,
    role: "user",
    freeSearchUsed: true,
    planLabel: "Starter",
    joinedAt: "2026-04-18T12:00:00.000Z",
  },
  {
    id: "usr_3",
    name: "Bruno Lima",
    email: "bruno@exemplo.com",
    phone: "(21) 97777-0002",
    credits: 21,
    role: "user",
    freeSearchUsed: true,
    planLabel: "Pro",
    joinedAt: "2026-04-20T12:00:00.000Z",
  },
]

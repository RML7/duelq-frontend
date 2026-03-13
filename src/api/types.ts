// Типы статусов и категорий
export type DuelStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'
export type DuelCategory = 'cinema' // добавь свои категории
export const ACTIVE_DUEL_STATUSES = ['pending', 'accepted', 'in_progress'] as const

// Базовые типы
export interface DuelResponse {
  id: string
  invite_link: string
  stake: number
  category: DuelCategory
  status: DuelStatus
  creator_id: string
  opponent_id?: string
  created_at: string
  expires_at: string
}

export interface Page {
  limit: number
  offset: number
}

// Auth
export interface LoginResponse {
  token: string
  user_id: string
}

// User
export interface UserResponse {
  id: string
  tg_id: number
  username: string | null
  first_name: string
  coins_balance: number
  last_active_at: string
  created_at: string
}

// Create Duel
export interface CreateDuelRequest {
  stake: number
  category: DuelCategory
}

export interface CreateDuelResponse {
  duel: DuelResponse
}

// List Duels
export interface ListDuelsRequest {
  page: Page
  status?: DuelStatus[]
}

export interface ListDuelsResponse {
  duels: DuelResponse[]
  count: number
}

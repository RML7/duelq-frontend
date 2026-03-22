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
  ton_address?: string | null
  jetton_usdt_address?: string | null
  last_active_at: string
  created_at: string
}

export interface SaveWalletRequest {
  ton_address: string | null
}

export interface SaveWalletResponse {
  user: UserResponse
}

// Create Duel
export interface CreateDuelRequest {
  stake: number
  category: DuelCategory
}

export interface CreateDuelResponse {
  duel: DuelResponse
}

// List Duels (GET /duels/list — query: page, limit, status[])
export interface ListDuelsRequest {
  /** Номер страницы, с 1 */
  page: number
  /** Размер страницы, 1…1000 */
  limit: number
  status?: DuelStatus[]
}

export interface ListDuelsResponse {
  duels: DuelResponse[]
  count: number
}

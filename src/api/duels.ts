import apiClient from './client'
import type { CreateDuelRequest, CreateDuelResponse, ListDuelsRequest, ListDuelsResponse, DuelResponse } from './types'

export interface RespondToDuelResponse {
  duel: DuelResponse
}

export const duelsApi = {
  /**
   * Получить информацию о дуэли по ID
   */
  async getDuel(duelId: string): Promise<DuelResponse> {
    const { data } = await apiClient.get<DuelResponse>(`/duels/${duelId}`)
    return data
  },

  /**
   * Создать новую дуэль
   */
  async create(params: CreateDuelRequest): Promise<CreateDuelResponse> {
    const { data } = await apiClient.post<CreateDuelResponse>('/duels', params)
    return data
  },

  /**
   * Получить список дуэлей пользователя (GET, query: page, limit, status…)
   */
  async list(params: ListDuelsRequest): Promise<ListDuelsResponse> {
    const search = new URLSearchParams()
    search.set('page', String(params.page))
    search.set('limit', String(params.limit))
    for (const s of params.status ?? []) {
      search.append('status', s)
    }
    const { data } = await apiClient.get<ListDuelsResponse>(`/duels/list?${search.toString()}`)
    return data
  },

  /**
   * Принять или отклонить дуэль
   */
  async respond(duelId: string, action: 'accept' | 'cancel'): Promise<RespondToDuelResponse> {
    const { data } = await apiClient.post<RespondToDuelResponse>(`/duels/${duelId}/respond`, { action })
    return data
  }
}

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
   * Получить список дуэлей пользователя
   */
  async list(params: ListDuelsRequest): Promise<ListDuelsResponse> {
    const { data } = await apiClient.post<ListDuelsResponse>('/duels/list', params)
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

import client from './client'
import type { CreateDuelRequest, CreateDuelResponse, ListDuelsRequest, ListDuelsResponse } from './types'

export const duelsApi = {
  /**
   * Создать новую дуэль
   */
  async create(payload: CreateDuelRequest): Promise<CreateDuelResponse> {
    const { data } = await client.post<CreateDuelResponse>('/duels/', payload)
    return data
  },

  /**
   * Получить список дуэлей пользователя
   */
  async list(payload: ListDuelsRequest): Promise<ListDuelsResponse> {
    const { data } = await client.post<ListDuelsResponse>('/duels/list', payload)
    return data
  },
}

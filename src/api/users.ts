import client from './client'
import type { UserResponse } from './types'

export const usersApi = {
  /**
   * Получение профиля пользователя по ID
   */
  async getUser(userId: string): Promise<UserResponse> {
    const { data } = await client.get<UserResponse>(`/users/${userId}`)
    return data
  },
}

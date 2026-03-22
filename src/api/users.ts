import client from './client'
import type { UserResponse, SaveWalletRequest, SaveWalletResponse } from './types'

export const usersApi = {
  /**
   * Получение профиля пользователя по ID
   */
  async getUser(userId: string): Promise<UserResponse> {
    const { data } = await client.get<UserResponse>(`/users/${userId}`)
    return data
  },

  /**
   * Сохранение TON адреса кошелька пользователя
   */
  async saveWallet(tonAddress: string | null): Promise<UserResponse> {
    const { data } = await client.post<SaveWalletResponse>('/users/wallet', {
      ton_address: tonAddress
    } as SaveWalletRequest)
    return data.user
  },
}

import client from './client'
import type { LoginResponse } from './types'

export const authApi = {
  /**
   * Авторизация через Telegram WebApp
   */
  async login(initData: string): Promise<LoginResponse> {
    const { data } = await client.post<LoginResponse>('/auth/telegram', { init_data: initData })
    return data
  },
}

import client from './client'

export const authApi = {
  login(initData) {
    return client.post('/auth/telegram', { init_data: initData })
  }
}

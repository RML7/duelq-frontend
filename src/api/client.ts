import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import { useToast } from '@/composables/useToast'
import { STORAGE_KEYS } from '@/constants/storage'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
})

const { showError } = useToast()

// Перед каждым запросом добавляем JWT токен
client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN)
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Обработка ошибок
client.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<{ message?: string }>) => {
    // Если 401 — чистим токен
    if (error.response?.status === 401) {
      localStorage.removeItem(STORAGE_KEYS.TOKEN)
      showError('Сессия истекла. Перезапустите приложение')
      return Promise.reject(error)
    }

    // Показываем ошибку из бэкенда или дефолтное сообщение
    const message = error.response?.data?.message || 'Что-то пошло не так'
    showError(message)

    return Promise.reject(error)
  }
)

export default client

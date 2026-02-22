import axios from 'axios'
import { useToast } from '@/composables/useToast'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
})

const { showError } = useToast()

// Перед каждым запросом добавляем JWT токен
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Обработка ошибок
client.interceptors.response.use(
  (response) => response,
  (error) => {
    // Если 401 — чистим токен
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
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

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { duelsApi } from '@/api/duels'
import { ACTIVE_DUEL_STATUSES } from '@/api/types'
import type { DuelResponse } from '@/api/types'

export const useDuelStore = defineStore('duel', () => {
  const showChallenge = ref(false)
  const showGame = ref(false)
  // Дуэль, которая сейчас открыта в UI (компонент GameRoom).
  const currentDuel = ref<DuelResponse | null>(null)
  // Последняя активная дуэль пользователя для кнопки "Вернуться в дуэль".
  const activeDuel = ref<DuelResponse | null>(null)

  function openChallenge(): void {
    showChallenge.value = true
  }

  function closeChallenge(): void {
    showChallenge.value = false
  }

  // Унифицированный вход в игровую комнату: и после create, и после resume.
  function openGameRoom(duel: DuelResponse): void {
    currentDuel.value = duel
    activeDuel.value = duel
    showChallenge.value = false
    showGame.value = true
  }

  // Обновляет активную дуэль из событий сервера, не ломая текущий экран.
  function updateActiveDuel(duel: DuelResponse): void {
    activeDuel.value = duel
    if (currentDuel.value?.id === duel.id) {
      currentDuel.value = duel
    }
  }

  // Закрывает только экран игры. Активная дуэль сохраняется для resume.
  function closeGame(): void {
    showGame.value = false
    currentDuel.value = null
  }

  // Полное завершение дуэли: закрыть экран и убрать возможность resume.
  function finishDuel(): void {
    closeGame()
    activeDuel.value = null
  }

  /**
   * Проверить наличие активных дуэлей (pending, accepted, in_progress)
   */
  async function checkActiveDuel(): Promise<boolean> {
    try {
      const data = await duelsApi.list({
        page: 1,
        limit: 1,
        status: [...ACTIVE_DUEL_STATUSES],
      })

      if (data.duels && data.duels.length > 0) {
        activeDuel.value = data.duels[0]
        return true
      }

      activeDuel.value = null
      return false
    } catch (error) {
      console.error('Failed to check active duel:', error)
      activeDuel.value = null
      return false
    }
  }

  return {
    showChallenge,
    showGame,
    currentDuel,
    activeDuel,
    openChallenge,
    closeChallenge,
    openGameRoom,
    updateActiveDuel,
    closeGame,
    finishDuel,
    checkActiveDuel,
  }
})

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { duelsApi } from '@/api/duels'
import type { DuelResponse } from '@/api/types'

export const useDuelStore = defineStore('duel', () => {
  const showChallenge = ref(false)
  const showGame = ref(false)
  const currentDuel = ref<DuelResponse | null>(null)
  const activeDuel = ref<DuelResponse | null>(null)

  function openChallenge(): void {
    showChallenge.value = true
  }

  function closeChallenge(): void {
    showChallenge.value = false
  }

  function setGameReady(duel: DuelResponse): void {
    currentDuel.value = duel
    showChallenge.value = false
    showGame.value = true
  }

  function closeGame(): void {
    showGame.value = false
    currentDuel.value = null
  }

  /**
   * Проверить наличие активных дуэлей (pending, accepted, in_progress)
   */
  async function checkActiveDuel(): Promise<boolean> {
    try {
      const data = await duelsApi.list({
        page: { limit: 1, offset: 0 },
        status: ['pending', 'accepted', 'in_progress'],
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

  /**
   * Вернуться в активную дуэль
   */
  function resumeActiveDuel(): void {
    if (activeDuel.value) {
      setGameReady(activeDuel.value)
    }
  }

  return {
    showChallenge,
    showGame,
    currentDuel,
    activeDuel,
    openChallenge,
    closeChallenge,
    setGameReady,
    closeGame,
    checkActiveDuel,
    resumeActiveDuel,
  }
})

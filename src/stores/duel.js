import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDuelStore = defineStore('duel', () => {
  const showChallenge = ref(false)
  const showGame = ref(false)
  const currentDuel = ref(null)

  function openChallenge() {
    showChallenge.value = true
  }

  function closeChallenge() {
    showChallenge.value = false
  }

  function setGameReady(duel) {
    currentDuel.value = duel
    showChallenge.value = false
    showGame.value = true
  }

  function closeGame() {
    showGame.value = false
    currentDuel.value = null
  }

  return {
    showChallenge,
    showGame,
    currentDuel,
    openChallenge,
    closeChallenge,
    setGameReady,
    closeGame,
  }
})

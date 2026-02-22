<script setup>
import { ref, onMounted } from 'vue'
import { authApi } from '@/api/auth'
import ChallengeModal from '@/components/ChallengeModal.vue'
import GameRoom from '@/components/GameRoom.vue'
import Toast from '@/components/Toast.vue'

// ref — это функция из Vue, которая делает переменную реактивной. Это значит: когда значение меняется — шаблон автоматически перерисовывается.
const user = ref(null)
const loading = ref(true)
const error = ref(null)
const showChallenge = ref(false)
const showGame = ref(false)
const currentDuel = ref(null)

onMounted(async () => {
  const tg = window.Telegram?.WebApp
  if (!tg) {
    error.value = 'Telegram SDK не доступен'
    loading.value = false
    return
  }

  tg.ready()
  tg.expand()
  user.value = tg.initDataUnsafe?.user || null

  try {
    const { data } = await authApi.login(tg.initData)
    localStorage.setItem('token', data.token)
  } catch (e) {
    error.value = e.message
  }

  loading.value = false
})

function handleGameReady(duel) {
  console.log('Game ready event received in App.vue:', duel)
  currentDuel.value = duel
  showChallenge.value = false
  showGame.value = true
}

function handleGameFinished(result) {
  console.log('Game finished:', result)
  showGame.value = false
  currentDuel.value = null
  // TODO: Показать экран с результатами
}

function closeGame() {
  showGame.value = false
  currentDuel.value = null
}
</script>

<template>
  <Toast />
  <div class="app">
    <div v-if="loading" class="loading">Загрузка...</div>

    <div v-else-if="error" class="error-card">{{ error }}</div>

    <template v-else>
      <div class="logo">DuelQ</div>
      <p class="subtitle">Интеллектуальные дуэли</p>

      <div class="balance-bar">
        <span class="star-icon">⭐</span>
        <span class="balance-amount">0</span>
        <span class="balance-label">Stars</span>
        <button class="add-btn">+</button>
      </div>

      <button class="btn-play" @click="showChallenge = true">👊 Вызвать друга</button>

      <ChallengeModal 
        v-if="showChallenge" 
        @close="showChallenge = false"
        @game-ready="handleGameReady"
      />

      <GameRoom
        v-if="showGame && currentDuel"
        :duel="currentDuel"
        @close="closeGame"
        @game-finished="handleGameFinished"
      />

      <div class="stats">
        <div class="stat-card">
          <div class="stat-value">0</div>
          <div class="stat-label">Игр</div>
        </div>
        <div class="stat-card">
          <div class="stat-value wins">0</div>
          <div class="stat-label">Побед</div>
        </div>
        <div class="stat-card">
          <div class="stat-value rate">0%</div>
          <div class="stat-label">Винрейт</div>
        </div>
      </div>
    </template>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background: #0a0a0f;
  color: #f0f0f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.app {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  min-height: 100vh;
}

.loading {
  color: #8888a0;
  font-size: 16px;
  margin-top: 40px;
}

.error-card {
  background: rgba(255,82,82,0.1);
  border: 1px solid rgba(255,82,82,0.3);
  border-radius: 16px;
  padding: 20px;
  color: #ff5252;
  text-align: center;
  width: 100%;
  max-width: 340px;
  margin-top: 40px;
}

.logo {
  font-family: 'JetBrains Mono', monospace;
  font-size: 36px;
  font-weight: 700;
  background: linear-gradient(135deg, #6c5ce7, #a29bfe, #fd79a8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 4px;
}

.subtitle {
  color: #8888a0;
  font-size: 14px;
  letter-spacing: 2px;
  text-transform: uppercase;
  text-align: center;
  margin-bottom: 32px;
}

.balance-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, rgba(255,193,7,0.1), rgba(255,215,0,0.05));
  border: 1px solid rgba(255,193,7,0.15);
  border-radius: 16px;
  padding: 12px 20px;
  width: 100%;
  max-width: 340px;
  margin-bottom: 24px;
}

.star-icon { font-size: 20px; }

.balance-amount {
  font-family: 'JetBrains Mono', monospace;
  font-size: 22px;
  font-weight: 700;
  color: #ffd700;
}

.balance-label {
  font-size: 12px;
  color: #55556a;
}

.add-btn {
  margin-left: auto;
  background: rgba(255,193,7,0.15);
  border: none;
  color: #ffd700;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-play {
  background: linear-gradient(135deg, #6c5ce7, #5a4bd1);
  color: white;
  border: none;
  border-radius: 16px;
  padding: 18px 32px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  max-width: 340px;
  margin-bottom: 32px;
  box-shadow: 0 4px 20px rgba(108, 92, 231, 0.3);
}

.stats {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  width: 100%;
  max-width: 340px;
}

.stat-card {
  background: #12121a;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  padding: 14px 12px;
  text-align: center;
}

.stat-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 22px;
  font-weight: 700;
}

.stat-value.wins { color: #00e676; }
.stat-value.rate { color: #a29bfe; }

.stat-label {
  font-size: 11px;
  color: #55556a;
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
</style>

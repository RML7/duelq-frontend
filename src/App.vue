<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { authApi } from '@/api/auth'
import ChallengeModal from '@/components/ChallengeModal.vue'
import GameRoom from '@/components/GameRoom.vue'
import Toast from '@/components/Toast.vue'
import AcceptDuelView from '@/components/AcceptDuelView.vue'
import RulesModal from '@/components/RulesModal.vue'
import { useDuelStore } from '@/stores/duel'
import { STORAGE_KEYS } from '@/constants/storage'

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
}

interface TelegramWebApp {
  initData: string
  initDataUnsafe: {
    user?: TelegramUser
    start_param?: string
  }
  ready: () => void
  expand: () => void
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp
    }
  }
}

const user = ref<TelegramUser | null>(null)
const loading = ref<boolean>(true)
const error = ref<string | null>(null)
const duelStore = useDuelStore()
const inviteDuelId = ref<string | null>(null)
const showAcceptDuel = ref<boolean>(false)
const showRules = ref<boolean>(false)

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

  // Извлечь duel_id из startapp параметра
  const startParam = tg.initDataUnsafe?.start_param
  console.log('Telegram start_param:', startParam)
  if (startParam) {
    inviteDuelId.value = startParam
    console.log('inviteDuelId set to:', inviteDuelId.value)
  }

  try {
    const data = await authApi.login(tg.initData)
    localStorage.setItem(STORAGE_KEYS.TOKEN, data.token)
    localStorage.setItem(STORAGE_KEYS.USER_ID, data.user_id)

    // Если есть invite, показать экран принятия дуэли
    if (inviteDuelId.value) {
      showAcceptDuel.value = true
    } else {
      // Иначе проверить наличие активных дуэлей
      await duelStore.checkActiveDuel()
    }
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Произошла ошибка'
  }

  loading.value = false
})

function resumeDuel(): void {
  if (duelStore.activeDuel) {
    duelStore.openGameRoom(duelStore.activeDuel)
  }
}

function closeAcceptDuel(): void {
  showAcceptDuel.value = false
  // После закрытия проверить активные дуэли
  duelStore.checkActiveDuel()
}
</script>

<template>
  <Toast />
  
  <!-- Экран принятия дуэли по приглашению -->
  <AcceptDuelView 
    v-if="showAcceptDuel && inviteDuelId" 
    :duel-id="inviteDuelId"
    @close="closeAcceptDuel"
  />

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

      <button 
        v-if="!duelStore.activeDuel"
        class="btn-play" 
        @click="duelStore.openChallenge()"
      >
        👊 Вызвать друга
      </button>

      <button 
        v-else
        class="btn-resume" 
        @click="resumeDuel"
      >
        🎮 Вернуться в дуэль
      </button>

      <ChallengeModal v-if="duelStore.showChallenge" />

      <GameRoom
        v-if="duelStore.showGame && duelStore.currentDuel"
        :duel="duelStore.currentDuel"
      />

      <RulesModal v-if="showRules" @close="showRules = false" />

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

      <button class="btn-rules" @click="showRules = true">
        📖 Правила игры
      </button>
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
  padding: 40px 20px 100px;
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

.btn-play,
.btn-resume {
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

.btn-resume {
  background: linear-gradient(135deg, #a29bfe, #6c5ce7);
  box-shadow: 0 4px 20px rgba(108, 92, 231, 0.4);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 4px 20px rgba(108, 92, 231, 0.4);
  }
  50% {
    box-shadow: 0 4px 30px rgba(162, 155, 254, 0.6);
  }
}

.btn-rules {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  color: #c0c0d0;
  border-radius: 12px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  width: 100%;
  max-width: 340px;
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  transition: all 0.2s;
}

.btn-rules:hover {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.12);
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

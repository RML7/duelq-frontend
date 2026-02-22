<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { duelsApi } from '@/api/duels'
import { useWebSocket, MessageType } from '@/composables/useWebSocket'
import { useDuelStore } from '@/stores/duel'

const STAKES = [10, 25, 50, 100]
const CATEGORIES = [
  { label: 'Кино', value: 'cinema' },
]

const step = ref('setup') // 'setup' | 'loading' | 'waiting'
const stake = ref(25)
const category = ref('cinema')
const duel = ref(null)
const timeRemaining = ref(300)
const duelStore = useDuelStore()

const DUEL_TIMEOUT_SECONDS = 300

const categoryLabel = computed(() => {
  return CATEGORIES.find(c => c.value === category.value)?.label || category.value
})

// WebSocket
const { connect, onMessage } = useWebSocket()

// Таймер для отсчёта времени ожидания
let timerInterval = null

function startTimer() {
  if (!duel.value?.created_at) return

  const createdTime = new Date(duel.value.created_at).getTime()
  
  timerInterval = setInterval(() => {
    const now = Date.now()
    const elapsed = Math.floor((now - createdTime) / 1000)
    const remaining = DUEL_TIMEOUT_SECONDS - elapsed

    if (remaining <= 0) {
      timeRemaining.value = 0
      clearInterval(timerInterval)
      // TODO: показать сообщение "Время истекло" и вернуть в setup
      step.value = 'setup'
    } else {
      timeRemaining.value = remaining
    }
  }, 1000)
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

onUnmounted(() => {
  stopTimer()
})

async function createDuel() {
  step.value = 'loading'

  try {
    const { data } = await duelsApi.create({ stake: stake.value, category: category.value })
    duel.value = data.duel
    step.value = 'waiting'
    startTimer()
    
    // Подключаемся к WebSocket
    const token = localStorage.getItem('token')
    connect(duel.value.id, token)
    
    // Подписываемся на сообщение game_ready
    onMessage(MessageType.GAME_READY, handleGameReady)
  } catch (e) {
    // Ошибка уже обработана в interceptor
    step.value = 'setup'
  }
}

function handleGameReady(data) {
  console.log('🎮 Game is ready!', data)
  duelStore.setGameReady(data.duel)
}

function shareLink() {
  const tg = window.Telegram?.WebApp
  if (tg && duel.value) {
    tg.openTelegramLink(
      `https://t.me/share/url?url=${encodeURIComponent(duel.value.invite_link)}&text=${encodeURIComponent('Принимай вызов! Сыграем в DuelQ? 🎯')}`
    )
  }
}

</script>

<template>
  <!-- Overlay -->
  <div class="overlay" @click.self="duelStore.closeChallenge()">
    <div class="sheet">

      <!-- ── STEP: setup ── -->
      <template v-if="step === 'setup'">
        <div class="sheet-header">
          <span class="sheet-title">Вызов друга</span>
          <button class="close-btn" @click="duelStore.closeChallenge()">✕</button>
        </div>

        <div class="section-label">Ставка</div>
        <div class="chips">
          <button
            v-for="s in STAKES"
            :key="s"
            class="chip"
            :class="{ active: stake === s }"
            @click="stake = s"
          >
            ⭐ {{ s }}
          </button>
        </div>

        <div class="section-label">Категория</div>
        <div class="chips wrap">
          <button
            v-for="c in CATEGORIES"
            :key="c.value"
            class="chip"
            :class="{ active: category === c.value }"
            @click="category = c.value"
          >
            {{ c.label }}
          </button>
        </div>

        <button class="btn-primary" @click="createDuel">
          Создать дуэль
        </button>
      </template>

      <!-- ── STEP: loading ── -->
      <template v-else-if="step === 'loading'">
        <div class="loading-block">
          <div class="spinner"></div>
          <p>Создаём дуэль…</p>
        </div>
      </template>

      <!-- ── STEP: waiting ── -->
      <template v-else-if="step === 'waiting'">
        <div class="sheet-header">
          <span class="sheet-title">Выберите оппонента</span>
          <button class="close-btn" @click="duelStore.closeChallenge()">✕</button>
        </div>

        <div class="waiting-card">
          <div class="timer-display">{{ timeRemaining }}</div>
          <div class="timer-label">секунд до отмены</div>
          <div class="waiting-title">Отправьте ссылку другу</div>
          <div class="waiting-subtitle">Нажмите кнопку ниже и выберите друга в Telegram. Как только он примет вызов — дуэль начнётся!</div>
        </div>

        <div class="duel-info">
          <div class="duel-info-row">
            <span class="duel-info-label">Ставка</span>
            <span class="duel-info-value">⭐ {{ stake }} Stars</span>
          </div>
          <div class="duel-info-row">
            <span class="duel-info-label">Категория</span>
            <span class="duel-info-value">{{ categoryLabel }}</span>
          </div>
        </div>

        <button class="btn-primary" @click="shareLink">
          📤 Выбрать оппонента
        </button>
      </template>

    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-end;
  z-index: 100;
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from { opacity: 0 }
  to   { opacity: 1 }
}

.sheet {
  width: 100%;
  background: #12121a;
  border-radius: 24px 24px 0 0;
  padding: 24px 20px 40px;
  animation: slideUp 0.25s ease;
}

@keyframes slideUp {
  from { transform: translateY(100%) }
  to   { transform: translateY(0) }
}

.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.sheet-title {
  font-size: 18px;
  font-weight: 700;
}

.close-btn {
  background: rgba(255,255,255,0.06);
  border: none;
  color: #8888a0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.section-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #55556a;
  margin-bottom: 10px;
}

.chips {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.chips.wrap {
  flex-wrap: wrap;
}

.chip {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  color: #c0c0d0;
  border-radius: 12px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}

.chip.active {
  background: rgba(108, 92, 231, 0.25);
  border-color: #6c5ce7;
  color: #a29bfe;
}

.btn-primary {
  background: linear-gradient(135deg, #6c5ce7, #5a4bd1);
  color: white;
  border: none;
  border-radius: 16px;
  padding: 16px;
  font-size: 15px;
  font-weight: 600;
  width: 100%;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(108, 92, 231, 0.3);
  margin-bottom: 10px;
}

.btn-ghost {
  background: transparent;
  border: none;
  color: #8888a0;
  font-size: 14px;
  width: 100%;
  padding: 8px;
  cursor: pointer;
}

/* Loading */
.loading-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px 0;
  color: #8888a0;
  font-size: 14px;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(108, 92, 231, 0.2);
  border-top-color: #6c5ce7;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg) }
}

/* Waiting Room */
.waiting-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px 20px;
  background: rgba(108, 92, 231, 0.08);
  border: 1px solid rgba(108, 92, 231, 0.2);
  border-radius: 16px;
  margin-bottom: 24px;
}

.timer-display {
  font-family: 'JetBrains Mono', monospace;
  font-size: 56px;
  font-weight: 700;
  color: #6c5ce7;
  line-height: 1;
}

.timer-label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #55556a;
  margin-bottom: 8px;
}

.waiting-title {
  font-size: 16px;
  font-weight: 600;
  color: #f0f0f5;
  margin-top: 4px;
}

.waiting-subtitle {
  font-size: 13px;
  color: #8888a0;
  text-align: center;
  line-height: 1.5;
}

.duel-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}

.duel-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.duel-info-label {
  font-size: 13px;
  color: #8888a0;
}

.duel-info-value {
  font-size: 14px;
  font-weight: 600;
  color: #f0f0f5;
}
</style>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useWebSocket, MessageType } from '@/composables/useWebSocket'
import { useDuelStore } from '@/stores/duel'
import type { DuelResponse } from '@/api/types'

interface GameRoomProps {
  duel: DuelResponse
}

interface TelegramWebAppWithShare {
  openTelegramLink?: (url: string) => void
}

interface GameReadyData {
  duel: DuelResponse
}

interface AnswerOption {
  id: number
  text: string
}

interface QuestionState {
  text: string
  answers: AnswerOption[]
  timeLeft: number
  roundNumber: number
  totalRounds: number
}

interface QuestionMessageData {
  text: string
  answers: AnswerOption[]
  time_left: number
  round_number: number
  total_rounds: number
}

interface RoundResultData {
  correct_answer_id?: number
  your_answer_id?: number
  scores?: Record<string, number>
}

interface GameFinishedData {
  winner_id?: string
  reason?: string
}

type RoomStep = 'waiting' | 'syncing' | 'playing'

const DUEL_TIMEOUT_SECONDS = 300

const props = defineProps<GameRoomProps>()
const duelStore = useDuelStore()
const { connect, disconnect, onMessage, offMessage } = useWebSocket()

const duel = ref<DuelResponse>(props.duel)
const step = ref<RoomStep>(duel.value.status === 'pending' ? 'waiting' : 'syncing')
const timeRemaining = ref<number>(DUEL_TIMEOUT_SECONDS)
const currentQuestion = ref<QuestionState | null>(null)
const selectedAnswer = ref<number | null>(null)
const answered = ref<boolean>(false)

const categoryLabel = computed(() => {
  if (duel.value.category === 'cinema') return 'Кино'
  return duel.value.category
})

let waitingTimer: number | null = null

function startWaitingTimer(): void {
  if (step.value !== 'waiting' || !duel.value.created_at) return

  function updateWaitingTime(): void {
    if (!duel.value.created_at) return

    const createdTime = new Date(duel.value.created_at).getTime()
    const now = Date.now()
    const elapsed = Math.floor((now - createdTime) / 1000)
    const remaining = DUEL_TIMEOUT_SECONDS - elapsed

    if (remaining <= 0) {
      timeRemaining.value = 0
      stopWaitingTimer()
      duelStore.finishDuel()
      return
    }

    timeRemaining.value = remaining
  }

  updateWaitingTime()

  waitingTimer = window.setInterval(() => {
    updateWaitingTime()
  }, 1000)
}

function stopWaitingTimer(): void {
  if (waitingTimer) {
    clearInterval(waitingTimer)
    waitingTimer = null
  }
}

function closeRoom(): void {
  duelStore.closeGame()
}

function shareLink(): void {
  const tg = window.Telegram?.WebApp as TelegramWebAppWithShare | undefined
  if (!tg?.openTelegramLink) return

  tg.openTelegramLink(
    `https://t.me/share/url?url=${encodeURIComponent(duel.value.invite_link)}&text=${encodeURIComponent('Принимай вызов! Сыграем в DuelQ? 🎯')}`
  )
}

function handleGameReady(data: GameReadyData): void {
  console.log('🎮 Game is ready!', data)
  duel.value = data.duel
  duelStore.updateActiveDuel(data.duel)
  stopWaitingTimer()
  step.value = 'syncing'
}

function handleQuestion(data: QuestionMessageData): void {
  console.log('📝 New question:', data)

  currentQuestion.value = {
    text: data.text,
    answers: data.answers,
    timeLeft: data.time_left,
    roundNumber: data.round_number,
    totalRounds: data.total_rounds,
  }
  selectedAnswer.value = null
  answered.value = false
  step.value = 'playing'
}

function handleRoundResult(data: RoundResultData): void {
  console.log('📊 Round result:', data)
  // TODO: Показать результат раунда
}

function handleGameFinished(data: GameFinishedData): void {
  console.log('🏁 Game finished:', data)
  stopWaitingTimer()
  duelStore.finishDuel()
}

function selectAnswer(answerId: number): void {
  if (answered.value) return

  selectedAnswer.value = answerId
  answered.value = true

  // TODO: Отправить ответ на сервер через WebSocket
  console.log('Selected answer:', answerId)
}

onMounted(() => {
  onMessage(MessageType.GAME_READY, handleGameReady)
  onMessage(MessageType.QUESTION, handleQuestion)
  onMessage(MessageType.ROUND_RESULT, handleRoundResult)
  onMessage(MessageType.GAME_FINISHED, handleGameFinished)

  const token = localStorage.getItem('token')
  if (token) {
    connect(duel.value.id, token)
  } else {
    console.error('JWT token is missing, cannot connect to WebSocket')
  }

  if (step.value === 'waiting') {
    startWaitingTimer()
  }
})

onUnmounted(() => {
  stopWaitingTimer()
  offMessage(MessageType.GAME_READY)
  offMessage(MessageType.QUESTION)
  offMessage(MessageType.ROUND_RESULT)
  offMessage(MessageType.GAME_FINISHED)
  disconnect()
})
</script>

<template>
  <div class="overlay">
    <div class="game-container">
      <div class="sheet-header">
        <span class="sheet-title" v-if="step === 'waiting'">Ожидание оппонента</span>
        <span class="sheet-title" v-else-if="step === 'syncing'">Дуэль начинается</span>
        <span class="sheet-title" v-else>Раунд {{ currentQuestion?.roundNumber }}/{{ currentQuestion?.totalRounds }}</span>
        <button class="close-btn" @click="closeRoom">✕</button>
      </div>

      <template v-if="step === 'waiting'">
        <div class="waiting-card">
          <div class="timer-display">{{ timeRemaining }}</div>
          <div class="timer-label">секунд до отмены</div>
          <div class="waiting-title">Отправьте ссылку другу</div>
          <div class="waiting-subtitle">Нажмите кнопку ниже и выберите друга в Telegram. Как только он примет вызов — дуэль начнётся!</div>
        </div>

        <div class="duel-info">
          <div class="duel-info-row">
            <span class="duel-info-label">Ставка</span>
            <span class="duel-info-value">⭐ {{ duel.stake }} Stars</span>
          </div>
          <div class="duel-info-row">
            <span class="duel-info-label">Категория</span>
            <span class="duel-info-value">{{ categoryLabel }}</span>
          </div>
        </div>

        <button class="btn-primary" @click="shareLink">📤 Выбрать оппонента</button>
      </template>

      <template v-else-if="step === 'syncing'">
        <div class="loading-block">
          <div class="spinner"></div>
          <p>Оппонент найден. Ждём первый вопрос…</p>
        </div>
      </template>

      <template v-else-if="currentQuestion">
        <div class="round-info">
          <span class="round-text">Раунд {{ currentQuestion.roundNumber }}/{{ currentQuestion.totalRounds }}</span>
          <div class="timer"><span class="timer-value">{{ currentQuestion.timeLeft }}s</span></div>
        </div>

        <div class="question-text">{{ currentQuestion.text }}</div>

        <div class="answers-grid">
          <button
            v-for="answer in currentQuestion.answers"
            :key="answer.id"
            class="answer-btn"
            :class="{ selected: selectedAnswer === answer.id, disabled: answered && selectedAnswer !== answer.id }"
            @click="selectAnswer(answer.id)"
          >
            <span class="answer-letter">{{ String.fromCharCode(64 + answer.id) }}</span>
            <span class="answer-text">{{ answer.text }}</span>
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: #0a0a0f;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.game-container {
  width: 100%;
  max-width: 500px;
  padding: 32px 20px;
  margin: 20px;
  background: #12121a;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 24px;
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
  background: rgba(255, 255, 255, 0.06);
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

.waiting-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 18px;
  padding: 24px;
  text-align: center;
  margin-bottom: 18px;
}

.timer-display {
  font-family: 'JetBrains Mono', monospace;
  font-size: 38px;
  font-weight: 700;
  color: #6c5ce7;
  line-height: 1;
  margin-bottom: 6px;
}

.timer-label {
  font-size: 11px;
  color: #66667a;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 18px;
}

.waiting-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
}

.waiting-subtitle {
  color: #8888a0;
  font-size: 13px;
  line-height: 1.5;
}

.duel-info {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 16px;
}

.duel-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.duel-info-row + .duel-info-row {
  margin-top: 10px;
}

.duel-info-label {
  color: #77778f;
  font-size: 13px;
}

.duel-info-value {
  font-weight: 600;
  font-size: 14px;
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
}

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

.round-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.round-text {
  font-size: 14px;
  font-weight: 600;
  color: #8888a0;
}

.timer {
  background: rgba(108, 92, 231, 0.2);
  border: 1px solid rgba(108, 92, 231, 0.4);
  border-radius: 20px;
  padding: 6px 14px;
}

.timer-value {
  font-size: 14px;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
  color: #6c5ce7;
}

.question-text {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  font-size: 16px;
  font-weight: 600;
  color: #f0f0f5;
  line-height: 1.6;
  text-align: center;
}

.answers-grid {
  display: grid;
  gap: 12px;
}

.answer-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.answer-btn:hover:not(.disabled) {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(108, 92, 231, 0.5);
  transform: translateY(-2px);
}

.answer-btn.selected {
  background: rgba(108, 92, 231, 0.2);
  border-color: #6c5ce7;
}

.answer-btn.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.answer-letter {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: rgba(108, 92, 231, 0.2);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
  color: #6c5ce7;
  flex-shrink: 0;
}

.answer-btn.selected .answer-letter {
  background: #6c5ce7;
  color: #fff;
}

.answer-text {
  font-size: 15px;
  color: #f0f0f5;
  line-height: 1.4;
}
</style>

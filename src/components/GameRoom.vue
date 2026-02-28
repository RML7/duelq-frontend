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

interface QuestionState {
  text: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  timeLeft: number
  roundNumber: number
  totalRounds: number
}

interface QuestionMessageData {
  text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  timeout_sec: number
  round: number
  server_time: number      // Текущее время сервера (Unix milliseconds UTC)
  round_starts_at: number  // Время старта раунда (Unix milliseconds UTC)
  round_deadline: number   // Время окончания раунда (Unix milliseconds UTC)
}

interface RoundResultData {
  correct_answer_id?: number
  your_answer_id?: number
  scores?: Record<string, number>
}

interface RoundResult {
  round: number
  creator_correct: boolean
  opponent_correct: boolean
  creator_response_time_ms: number | null
  opponent_response_time_ms: number | null
  winner: 'creator' | 'opponent' | 'draw'
}

interface GameFinishedData {
  creator_id: string
  opponent_id: string
  creator_name: string
  opponent_name: string
  winner: 'creator' | 'opponent' | 'draw'
  rounds: RoundResult[]
}

type RoomStep = 'waiting' | 'syncing' | 'round_starting' | 'playing' | 'finished'

const DUEL_TIMEOUT_SECONDS = 300

const props = defineProps<GameRoomProps>()
const duelStore = useDuelStore()
const { connect, disconnect, onMessage, offMessage, send } = useWebSocket()

const duel = ref<DuelResponse>(props.duel)
const step = ref<RoomStep>(duel.value.status === 'pending' ? 'waiting' : 'syncing')
const timeRemaining = ref<number>(DUEL_TIMEOUT_SECONDS)
const currentQuestion = ref<QuestionState | null>(null)
const selectedAnswer = ref<string | null>(null)
const answered = ref<boolean>(false)
const roundResult = ref<RoundResultData | null>(null)
const gameResult = ref<GameFinishedData | null>(null)
const countdownToStart = ref<number>(0) // Обратный отсчет до старта раунда

const categoryLabel = computed(() => {
  if (duel.value?.category === 'cinema') return 'Кино'
  return duel.value?.category || ''
})

// Определяем порядок отображения: Я первый, оппонент второй
const firstPlayerName = computed(() => {
  if (!gameResult.value) return 'Игрок 1'
  const userId = localStorage.getItem('user_id')
  if (gameResult.value.creator_id === userId) {
    return gameResult.value.creator_name
  } else {
    return gameResult.value.opponent_name
  }
})

const secondPlayerName = computed(() => {
  if (!gameResult.value) return 'Игрок 2'
  const userId = localStorage.getItem('user_id')
  if (gameResult.value.creator_id === userId) {
    return gameResult.value.opponent_name
  } else {
    return gameResult.value.creator_name
  }
})

const iAmCreator = computed(() => {
  if (!gameResult.value) return false
  const userId = localStorage.getItem('user_id')
  return gameResult.value.creator_id === userId
})

const iAmWinner = computed(() => {
  if (!gameResult.value) return false
  const userId = localStorage.getItem('user_id')
  if (gameResult.value.winner === 'draw') return false
  
  if (gameResult.value.creator_id === userId) {
    return gameResult.value.winner === 'creator'
  } else {
    return gameResult.value.winner === 'opponent'
  }
})

const isDraw = computed(() => {
  return gameResult.value?.winner === 'draw'
})

let waitingTimer: number | null = null
let questionTimer: number | null = null
let startDelayTimeout: number | null = null
let countdownInterval: number | null = null

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
  stopQuestionTimer()
  stopCountdown()
  if (startDelayTimeout) {
    clearTimeout(startDelayTimeout)
    startDelayTimeout = null
  }
  offMessage(MessageType.GAME_READY)
  offMessage(MessageType.QUESTION)
  offMessage(MessageType.ROUND_RESULT)
  offMessage(MessageType.GAME_FINISHED)
  disconnect()
})

function startWaitingTimer(): void {
  if (step.value !== 'waiting' || !duel.value?.created_at) return

  function updateWaitingTime(): void {
    if (!duel.value?.created_at) {
      stopWaitingTimer()
      return
    }

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

function startQuestionTimer(durationMs: number): void {
  stopQuestionTimer()

  const endTime = Date.now() + durationMs

  questionTimer = window.setInterval(() => {
    if (!currentQuestion.value) return

    const remaining = Math.max(0, endTime - Date.now())
    currentQuestion.value.timeLeft = Math.ceil(remaining / 1000) // Показываем секунды

    if (remaining <= 0) {
      stopQuestionTimer()
      // Если время вышло и игрок не ответил, можно отправить пустой ответ или ничего не делать
    }
  }, 50) // Обновляем каждые 50ms для плавности
}

function stopQuestionTimer(): void {
  if (questionTimer) {
    clearInterval(questionTimer)
    questionTimer = null
  }
  if (startDelayTimeout) {
    clearTimeout(startDelayTimeout)
    startDelayTimeout = null
  }
}

function startCountdown(delayMs: number): void {
  stopCountdown()
  
  const endTime = Date.now() + delayMs
  
  countdownInterval = window.setInterval(() => {
    const remaining = Math.max(0, endTime - Date.now())
    countdownToStart.value = Math.ceil(remaining / 1000)
    
    if (remaining <= 0) {
      stopCountdown()
    }
  }, 50)
}

function stopCountdown(): void {
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
  countdownToStart.value = 0
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

  // 1. Вычисляем clock offset между клиентом и сервером
  const clockOffset = data.server_time - Date.now()
  console.log('⏰ Clock offset:', clockOffset, 'ms')

  // 2. Корректируем время старта раунда под клиентские часы
  const roundStartsAtClient = data.round_starts_at - clockOffset
  const delayUntilStart = roundStartsAtClient - Date.now()
  console.log('⏱️ Delay until start:', delayUntilStart, 'ms')

  // Сохраняем вопрос (но не показываем его пока)
  currentQuestion.value = {
    text: data.text,
    optionA: data.option_a,
    optionB: data.option_b,
    optionC: data.option_c,
    optionD: data.option_d,
    timeLeft: data.timeout_sec,
    roundNumber: data.round,
    totalRounds: 7, // DUEL_QUESTIONS_COUNT
  }
  selectedAnswer.value = null
  answered.value = false
  roundResult.value = null

  // 3. Подождать до старта раунда, потом показать вопрос и запустить таймер
  if (delayUntilStart > 0) {
    // Нормальный случай: показываем экран ожидания с обратным отсчетом
    console.log('⏳ Waiting', delayUntilStart, 'ms before starting round')
    step.value = 'round_starting'
    startCountdown(delayUntilStart)
    
    startDelayTimeout = window.setTimeout(() => {
      console.log('🚀 Starting round now!')
      step.value = 'playing'
      stopCountdown()
      startQuestionTimer(data.timeout_sec * 1000)
    }, delayUntilStart)
  } else {
    // Опоздали: показываем вопрос сразу с уменьшенным таймером
    const remainingTime = data.timeout_sec * 1000 + delayUntilStart
    console.log('⚡ Starting immediately with remaining time:', remainingTime, 'ms')
    step.value = 'playing'
    startQuestionTimer(Math.max(0, remainingTime))
  }
}

function handleRoundResult(data: RoundResultData): void {
  console.log('📊 Round result:', data)
  stopQuestionTimer()
  roundResult.value = data
  // Не меняем step - просто ждем следующий question от сервера
  // Сервер сам управляет таймингом через round_starts_at
}

function handleGameFinished(data: GameFinishedData): void {
  console.log('🏁 Game finished:', data)
  stopQuestionTimer()
  stopWaitingTimer()
  stopCountdown()
  gameResult.value = data
  step.value = 'finished'
  console.log('✅ Step changed to finished, gameResult:', gameResult.value)
}

function selectAnswer(answerLetter: string): void {
  if (answered.value) {
    console.log('⚠️ Already answered, ignoring click')
    return
  }

  console.log('👆 User clicked answer:', answerLetter)
  
  selectedAnswer.value = answerLetter
  answered.value = true

  console.log('📤 Sending answer to server:', answerLetter)
  
  // Отправляем ответ на сервер
  send({
    type: MessageType.ANSWER,
    data: {
      answer: answerLetter
    }
  })

  console.log('✅ Answer sent successfully:', answerLetter)
}

function finishGame(): void {
  duelStore.finishDuel()
}
</script>

<template>
  <div class="overlay">
    <div class="game-container">
      <div class="sheet-header">
        <span class="sheet-title" v-if="step === 'waiting'">Ожидание оппонента</span>
        <span class="sheet-title" v-else-if="step === 'syncing'">Дуэль начинается</span>
        <span class="sheet-title" v-else-if="step === 'round_starting'">Готовьтесь...</span>
        <span class="sheet-title" v-else-if="step === 'playing'">Вопрос</span>
        <span class="sheet-title" v-else-if="step === 'finished'">Игра окончена</span>
        <button class="close-btn" @click="closeRoom">✕</button>
      </div>

      <!-- Ожидание оппонента -->
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

      <!-- Синхронизация / ожидание вопроса -->
      <template v-else-if="step === 'syncing'">
        <div class="loading-block">
          <div class="spinner"></div>
          <p>Оппонент найден. Ждём следующий вопрос…</p>
        </div>
      </template>

      <!-- Обратный отсчет до старта раунда -->
      <template v-else-if="step === 'round_starting'">
        <div class="countdown-block">
          <div class="countdown-circle">
            <div class="countdown-number">{{ countdownToStart }}</div>
          </div>
          <div class="countdown-text">Раунд начнется через</div>
          <div class="countdown-subtext">Приготовьтесь!</div>
        </div>
      </template>

      <!-- Игровой раунд с вопросом -->
      <template v-else-if="step === 'playing' && currentQuestion">
        <div class="round-info">
          <span class="round-text">Раунд {{ currentQuestion.roundNumber }}/{{ currentQuestion.totalRounds }}</span>
          <div class="timer"><span class="timer-value">{{ currentQuestion.timeLeft }}s</span></div>
        </div>

        <div class="question-text">{{ currentQuestion.text }}</div>

        <div class="answers-grid">
          <button
            class="answer-btn"
            :class="{ 
              selected: selectedAnswer === 'A', 
              disabled: answered && selectedAnswer !== 'A' 
            }"
            @click="selectAnswer('A')"
          >
            <span class="answer-letter">A</span>
            <span class="answer-text">{{ currentQuestion.optionA }}</span>
          </button>

          <button
            class="answer-btn"
            :class="{ 
              selected: selectedAnswer === 'B', 
              disabled: answered && selectedAnswer !== 'B' 
            }"
            @click="selectAnswer('B')"
          >
            <span class="answer-letter">B</span>
            <span class="answer-text">{{ currentQuestion.optionB }}</span>
          </button>

          <button
            class="answer-btn"
            :class="{ 
              selected: selectedAnswer === 'C', 
              disabled: answered && selectedAnswer !== 'C' 
            }"
            @click="selectAnswer('C')"
          >
            <span class="answer-letter">C</span>
            <span class="answer-text">{{ currentQuestion.optionC }}</span>
          </button>

          <button
            class="answer-btn"
            :class="{ 
              selected: selectedAnswer === 'D', 
              disabled: answered && selectedAnswer !== 'D' 
            }"
            @click="selectAnswer('D')"
          >
            <span class="answer-letter">D</span>
            <span class="answer-text">{{ currentQuestion.optionD }}</span>
          </button>
        </div>
      </template>

      <!-- Финальные результаты -->
      <template v-else-if="step === 'finished' && gameResult">
        <div class="final-card">
          <!-- Результат игры: Победа/Поражение/Ничья -->
          <div class="game-result" :class="{ win: iAmWinner, lose: !iAmWinner && !isDraw, draw: isDraw }">
            <div class="result-text">{{ isDraw ? 'Ничья' : (iAmWinner ? 'Победа' : 'Поражение') }}</div>
          </div>

          <!-- Статистика по раундам -->
          <div class="rounds-stats">
            <div class="rounds-title">Статистика раундов</div>
            
            <div class="rounds-table">
              <div class="table-header">
                <div class="table-cell round-col">#</div>
                <div class="table-cell result-col">{{ firstPlayerName }}</div>
                <div class="table-cell result-col">{{ secondPlayerName }}</div>
              </div>
              
              <div 
                v-for="round in gameResult.rounds" 
                :key="round.round"
                class="table-row"
              >
                <div class="table-cell round-col">{{ round.round }}</div>
                
                <!-- Первый игрок (Я) -->
                <div class="table-cell result-col">
                  <div class="result-content">
                    <div class="result-row">
                      <span class="result-icon" :class="{ 
                        correct: iAmCreator ? round.creator_correct : round.opponent_correct, 
                        wrong: iAmCreator ? !round.creator_correct : !round.opponent_correct 
                      }">
                        {{ (iAmCreator ? round.creator_correct : round.opponent_correct) ? '✓' : '✗' }}
                      </span>
                      <span class="crown" v-if="(iAmCreator && round.winner === 'creator') || (!iAmCreator && round.winner === 'opponent')">👑</span>
                    </div>
                    <span class="response-time">
                      {{ (iAmCreator ? round.creator_response_time_ms : round.opponent_response_time_ms) !== null 
                        ? `${iAmCreator ? round.creator_response_time_ms : round.opponent_response_time_ms}ms` 
                        : '-' }}
                    </span>
                  </div>
                </div>
                
                <!-- Второй игрок (Оппонент) -->
                <div class="table-cell result-col">
                  <div class="result-content">
                    <div class="result-row">
                      <span class="result-icon" :class="{ 
                        correct: iAmCreator ? round.opponent_correct : round.creator_correct, 
                        wrong: iAmCreator ? !round.opponent_correct : !round.creator_correct 
                      }">
                        {{ (iAmCreator ? round.opponent_correct : round.creator_correct) ? '✓' : '✗' }}
                      </span>
                      <span class="crown" v-if="(iAmCreator && round.winner === 'opponent') || (!iAmCreator && round.winner === 'creator')">👑</span>
                    </div>
                    <span class="response-time">
                      {{ (iAmCreator ? round.opponent_response_time_ms : round.creator_response_time_ms) !== null 
                        ? `${iAmCreator ? round.opponent_response_time_ms : round.creator_response_time_ms}ms` 
                        : '-' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Кнопки -->
          <div class="final-actions">
            <button class="btn-primary" @click="finishGame">Закрыть</button>
          </div>
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
  max-height: calc(100vh - 40px);
  padding: 20px 16px;
  margin: 20px;
  background: #12121a;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 24px;
  overflow-y: auto;
  overflow-x: hidden;
}

.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
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

.countdown-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 60px 0;
}

.countdown-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(108, 92, 231, 0.2), rgba(162, 155, 254, 0.1));
  border: 3px solid #6c5ce7;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 30px rgba(108, 92, 231, 0.4);
  animation: pulse-glow 1.5s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 30px rgba(108, 92, 231, 0.4);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 0 50px rgba(108, 92, 231, 0.6);
    transform: scale(1.05);
  }
}

.countdown-number {
  font-family: 'JetBrains Mono', monospace;
  font-size: 56px;
  font-weight: 700;
  color: #6c5ce7;
  line-height: 1;
}

.countdown-text {
  font-size: 18px;
  font-weight: 600;
  color: #f0f0f5;
}

.countdown-subtext {
  font-size: 14px;
  color: #8888a0;
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

.answer-btn:hover:not(.disabled):not(.selected) {
  background: rgba(255, 255, 255, 0.06);
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

@keyframes scaleIn {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.final-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 0;
}

.game-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  border-radius: 12px;
  animation: scaleIn 0.4s ease;
}

.game-result.win {
  background: rgba(46, 213, 115, 0.15);
  border: 2px solid #2ed573;
}

.game-result.lose {
  background: rgba(255, 71, 87, 0.15);
  border: 2px solid #ff4757;
}

.game-result.draw {
  background: rgba(255, 184, 0, 0.15);
  border: 2px solid #ffb800;
}

.result-text {
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
}

.game-result.win .result-text {
  color: #2ed573;
}

.game-result.lose .result-text {
  color: #ff4757;
}

.game-result.draw .result-text {
  color: #ffb800;
}

.result-score {
  font-family: 'JetBrains Mono', monospace;
  font-size: 20px;
  font-weight: 700;
  color: #8888a0;
}

.score-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
}

.score-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.score-label {
  font-size: 11px;
  color: #8888a0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.score-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 32px;
  font-weight: 700;
  color: #6c5ce7;
  line-height: 1;
}

.score-divider {
  font-family: 'JetBrains Mono', monospace;
  font-size: 32px;
  font-weight: 700;
  color: #44445a;
  line-height: 1;
}

.rounds-stats {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 16px;
  flex: 1;
}

.rounds-title {
  font-size: 14px;
  font-weight: 700;
  color: #f0f0f5;
  margin-bottom: 12px;
}

.rounds-table {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.table-header {
  display: grid;
  grid-template-columns: 32px 1fr 1fr;
  gap: 8px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  margin-bottom: 4px;
}

.table-row {
  display: grid;
  grid-template-columns: 32px 1fr 1fr;
  gap: 8px;
  padding: 10px 8px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  transition: background 0.2s ease;
}

.table-row:hover {
  background: rgba(255, 255, 255, 0.04);
}

.table-cell {
  display: flex;
  align-items: center;
  font-size: 12px;
}

.round-col {
  justify-content: center;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
  color: #8888a0;
}

.result-col {
  justify-content: center;
}

.result-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.result-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.crown {
  font-size: 12px;
  animation: crownPulse 1.5s ease-in-out infinite;
}

@keyframes crownPulse {
  0%, 100% { 
    transform: scale(1);
    opacity: 1;
  }
  50% { 
    transform: scale(1.2);
    opacity: 0.8;
  }
}

.result-icon {
  font-size: 14px;
  font-weight: 700;
}

.result-icon.correct {
  color: #2ed573;
}

.result-icon.wrong {
  color: #ff4757;
}

.response-time {
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
  color: #8888a0;
}

.final-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>

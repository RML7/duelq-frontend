<script setup>
import { ref, onMounted } from 'vue'
import { useWebSocket, MessageType } from '@/composables/useWebSocket'
import { useDuelStore } from '@/stores/duel'

const props = defineProps({
  duel: {
    type: Object,
    required: true,
  },
})

const duelStore = useDuelStore()

const { connected, onMessage } = useWebSocket()

// Мок данные для вопроса (временно)
const currentQuestion = ref({
  text: 'Какой язык программирования используется для разработки Android приложений?',
  answers: [
    { id: 1, text: 'Kotlin' },
    { id: 2, text: 'Swift' },
    { id: 3, text: 'Python' },
    { id: 4, text: 'Ruby' },
  ],
  timeLeft: 30,
  roundNumber: 1,
  totalRounds: 5,
})

const selectedAnswer = ref(null)
const answered = ref(false)

onMounted(() => {
  console.log('GameRoom mounted with duel:', props.duel)
  
  // Здесь будут обработчики для игровых сообщений
  onMessage(MessageType.QUESTION, handleQuestion)
  onMessage(MessageType.ROUND_RESULT, handleRoundResult)
  onMessage(MessageType.GAME_FINISHED, handleGameFinished)
})

function handleQuestion(data) {
  console.log('📝 New question:', data)
  // TODO: Обновить currentQuestion данными с сервера
}

function handleRoundResult(data) {
  console.log('📊 Round result:', data)
  // TODO: Показать результат раунда
}

function handleGameFinished(data) {
  console.log('🏁 Game finished:', data)
  duelStore.closeGame()
}

function selectAnswer(answerId) {
  if (answered.value) return
  selectedAnswer.value = answerId
  answered.value = true
  
  // TODO: Отправить ответ на сервер через WebSocket
  console.log('Selected answer:', answerId)
}
</script>

<template>
  <div class="overlay">
    <div class="game-container">
      <div class="round-info">
        <span class="round-text">Раунд {{ currentQuestion.roundNumber }}/{{ currentQuestion.totalRounds }}</span>
        <div class="timer">
          <span class="timer-value">{{ currentQuestion.timeLeft }}s</span>
        </div>
      </div>

      <div class="question-text">
        {{ currentQuestion.text }}
      </div>

      <div class="answers-grid">
        <button
          v-for="answer in currentQuestion.answers"
          :key="answer.id"
          class="answer-btn"
          :class="{ 
            selected: selectedAnswer === answer.id,
            disabled: answered && selectedAnswer !== answer.id
          }"
          @click="selectAnswer(answer.id)"
        >
          <span class="answer-letter">{{ String.fromCharCode(64 + answer.id) }}</span>
          <span class="answer-text">{{ answer.text }}</span>
        </button>
      </div>
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

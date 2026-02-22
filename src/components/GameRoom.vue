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

onMounted(() => {
  console.log('GameRoom mounted with duel:', props.duel)
  
  // Здесь будут обработчики для игровых сообщений
  onMessage(MessageType.QUESTION, handleQuestion)
  onMessage(MessageType.ROUND_RESULT, handleRoundResult)
  onMessage(MessageType.GAME_FINISHED, handleGameFinished)
})

function handleQuestion(data) {
  console.log('📝 New question:', data)
  // TODO: Отобразить вопрос
}

function handleRoundResult(data) {
  console.log('📊 Round result:', data)
  // TODO: Показать результат раунда
}

function handleGameFinished(data) {
  console.log('🏁 Game finished:', data)
  duelStore.closeGame()
}
</script>

<template>
  <div class="overlay">
    <div class="game-container">
      <div class="game-header">
        <span class="game-title">Игровая комната</span>
        <div class="connection-status" :class="{ connected }">
          {{ connected ? '🟢 Подключено' : '🔴 Отключено' }}
        </div>
      </div>

      <div class="game-info">
        <div class="info-row">
          <span class="label">Ставка:</span>
          <span class="value">⭐ {{ duel.stake }} Stars</span>
        </div>
        <div class="info-row">
          <span class="label">Категория:</span>
          <span class="value">{{ duel.category }}</span>
        </div>
        <div class="info-row">
          <span class="label">Статус:</span>
          <span class="value">{{ duel.status }}</span>
        </div>
      </div>

      <div class="placeholder">
        <div class="placeholder-icon">🎮</div>
        <div class="placeholder-title">Игровая комната</div>
        <div class="placeholder-text">
          Здесь будет игровой процесс: вопросы, ответы, таймеры, результаты
        </div>
      </div>

      <button class="btn-close" @click="duelStore.closeGame()">
        Закрыть (временно)
      </button>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
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
  max-width: 400px;
  background: #12121a;
  border-radius: 16px;
  padding: 24px;
  margin: 20px;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.game-title {
  font-size: 20px;
  font-weight: 700;
  color: #f0f0f5;
}

.connection-status {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 12px;
  background: rgba(255, 82, 82, 0.2);
  color: #ff5252;
}

.connection-status.connected {
  background: rgba(46, 213, 115, 0.2);
  color: #2ed573;
}

.game-info {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
}

.info-row .label {
  color: #8888a0;
  font-size: 14px;
}

.info-row .value {
  color: #f0f0f5;
  font-size: 14px;
  font-weight: 600;
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 20px;
  background: rgba(108, 92, 231, 0.08);
  border: 1px solid rgba(108, 92, 231, 0.2);
  border-radius: 16px;
  margin-bottom: 24px;
}

.placeholder-icon {
  font-size: 64px;
}

.placeholder-title {
  font-size: 18px;
  font-weight: 600;
  color: #f0f0f5;
}

.placeholder-text {
  font-size: 14px;
  color: #8888a0;
  text-align: center;
  line-height: 1.6;
}

.btn-close {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #f0f0f5;
  border-radius: 12px;
  padding: 12px;
  font-size: 14px;
  width: 100%;
  cursor: pointer;
}

.btn-close:hover {
  background: rgba(255, 255, 255, 0.15);
}
</style>

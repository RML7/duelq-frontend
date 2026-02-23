<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { duelsApi } from '@/api/duels'
import { getCategoryLabel } from '@/types/categories'
import type { DuelResponse } from '@/api/types'

interface Props {
  duelId: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

const duel = ref<DuelResponse | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    duel.value = await duelsApi.getDuel(props.duelId)
  } catch (e) {
    console.error('getDuel error:', e)
    // Закрываем модал, чтобы пользователь увидел основной экран и toast
    handleClose()
  } finally {
    loading.value = false
  }
})

function handleAccept() {
  // TODO: реализовать принятие дуэли
  console.log('Accept duel', props.duelId)
}

function handleCancel() {
  // TODO: реализовать отклонение дуэли
  console.log('Cancel duel', props.duelId)
}

function handleClose() {
  emit('close')
}
</script>

<template>
  <div class="accept-duel-overlay">
    <div class="accept-duel-modal">
      <button class="close-btn" @click="handleClose">✕</button>

      <div v-if="loading" class="loading">Загрузка...</div>

      <template v-else-if="duel">
        <div class="modal-header">
          <div class="icon">🎯</div>
          <h2>Приглашение на дуэль</h2>
        </div>

        <div class="duel-info">
          <div class="info-row">
            <span class="label">Ставка:</span>
            <span class="value">
              <span class="star-icon">⭐</span>
              {{ duel.stake }} Stars
            </span>
          </div>
          <div class="info-row">
            <span class="label">Категория:</span>
            <span class="value category">{{ getCategoryLabel(duel.category) }}</span>
          </div>
        </div>

        <div class="actions">
          <button class="btn btn-accept" @click="handleAccept">
            Принять
          </button>
          <button class="btn btn-cancel" @click="handleCancel">
            Отклонить
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.accept-duel-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;
}

.accept-duel-modal {
  background: #12121a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 32px 24px;
  width: 100%;
  max-width: 400px;
  position: relative;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: none;
  color: #8888a0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f0f0f5;
}

.loading {
  text-align: center;
  color: #8888a0;
  padding: 20px;
}

.modal-header {
  text-align: center;
  margin-bottom: 32px;
}

.icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.modal-header h2 {
  font-size: 24px;
  font-weight: 600;
  color: #f0f0f5;
  margin: 0;
}

.duel-info {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
}

.info-row:not(:last-child) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.label {
  color: #8888a0;
  font-size: 14px;
}

.value {
  color: #f0f0f5;
  font-weight: 600;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.star-icon {
  font-size: 18px;
}

.category {
  text-transform: capitalize;
  color: #a29bfe;
}

.actions {
  display: flex;
  gap: 12px;
}

.btn {
  flex: 1;
  border: none;
  border-radius: 12px;
  padding: 16px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-accept {
  background: linear-gradient(135deg, #4caf50, #388e3c);
  color: white;
  box-shadow: 0 4px 16px rgba(76, 175, 80, 0.25);
}

.btn-accept:hover {
  background: linear-gradient(135deg, #5cb860, #43a047);
  box-shadow: 0 6px 24px rgba(76, 175, 80, 0.35);
  transform: translateY(-2px);
}

.btn-cancel {
  background: rgba(255, 82, 82, 0.15);
  color: #ff5252;
  border: 1px solid rgba(255, 82, 82, 0.3);
}

.btn-cancel:hover {
  background: rgba(255, 82, 82, 0.25);
}
</style>

<script setup lang="ts">
import {computed, ref} from 'vue'

const emit = defineEmits<{
  close: []
}>()

const inputAmount = ref<string>('100')
const coinToUsdtRate = 0.01 // 100 монет = 1 USDT
const minAmount = 100

const coinsAmount = computed(() => {
  return parseInt(inputAmount.value) || 0
})

const usdtAmount = computed(() => {
  return (coinsAmount.value * coinToUsdtRate).toFixed(2)
})

const isBelowMinimum = computed(() => {
  return coinsAmount.value > 0 && coinsAmount.value < minAmount
})

const tonWalletAddress = '0QA5WUZ7ZHkuIh_A99lKWHxY_E1nyvj8lzbSS0dTl1ZUpShr'
const userId = localStorage.getItem('user_id') || 'unknown'
const copiedAddress = ref(false)
const copiedComment = ref(false)

function handleClose() {
  emit('close')
}

function copyToClipboard(text: string, type: 'address' | 'comment') {
  navigator.clipboard.writeText(text).then(() => {
    if (type === 'address') {
      copiedAddress.value = true
      setTimeout(() => copiedAddress.value = false, 2000)
    } else {
      copiedComment.value = true
      setTimeout(() => copiedComment.value = false, 2000)
    }
  })
}
</script>

<template>
  <div class="modal-overlay" @click="handleClose">
    <div class="modal-content" @click.stop>
      <button class="close-btn" @click="handleClose">×</button>
      
      <div class="modal-header">
        <img src="@/assets/icons/coin.png" alt="coin" class="header-coin" />
        <h2>Пополнить баланс</h2>
      </div>

      <div class="input-section">
        <input
          v-model="inputAmount"
          type="number"
          :min="minAmount"
          class="coin-input"
          :class="{ error: isBelowMinimum }"
          placeholder="100"
        />
        <div v-if="isBelowMinimum" class="error-message">
          ⚠️ Минимальная сумма пополнения — {{ minAmount }} монет
        </div>
        <div class="conversion-row">
          <span class="conversion-item">{{ usdtAmount }} USDT</span>
          <span class="conversion-separator">•</span>
          <span class="conversion-item rate">100 монет = 1 USDT</span>
        </div>
      </div>

      <div class="payment-info">
        <div class="info-block">
          <div class="info-label">Адрес для перевода:</div>
          <div class="info-value-wrapper">
            <div class="info-value address">{{ tonWalletAddress }}</div>
            <button 
              class="copy-btn" 
              :class="{ copied: copiedAddress }"
              @click="copyToClipboard(tonWalletAddress, 'address')"
              title="Копировать">
              <svg v-if="!copiedAddress" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="icon">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="icon">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </button>
          </div>
        </div>
        <div class="info-block">
          <div class="info-label">Комментарий (обязательно!):</div>
          <div class="info-value-wrapper">
            <div class="info-value comment">{{ userId }}</div>
            <button 
              class="copy-btn" 
              :class="{ copied: copiedComment }"
              @click="copyToClipboard(userId, 'comment')"
              title="Копировать">
              <svg v-if="!copiedComment" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="icon">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="icon">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div class="info-box">
        <div class="info-item">💰 Минимальная сумма: {{ minAmount }} монет ({{ (minAmount * coinToUsdtRate).toFixed(2) }} USDT)</div>
        <div class="info-item">💳 Принимаются только USDT в сети TON</div>
        <div class="info-item">⚠️ Транзакции меньше минимума будут отклонены</div>
      </div>
      
      <div class="warning">
        ⚠️ Обязательно укажите комментарий, иначе перевод не будет зачислен
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: #12121a;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 20px 16px;
  max-width: 360px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(255, 255, 255, 0.06);
  border: none;
  color: #8888a0;
  width: 32px;
  height: 32px;
  min-width: 32px;
  min-height: 32px;
  border-radius: 50%;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  padding: 0;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f0f0f5;
}

.modal-header {
  text-align: center;
  margin-bottom: 16px;
}

.header-coin {
  width: 32px;
  height: 32px;
  margin-bottom: 6px;
  animation: coinBounce 0.6s ease-out;
}

@keyframes coinBounce {
  0%, 100% {
    transform: translateY(0) rotateY(0deg);
  }
  25% {
    transform: translateY(-15px) rotateY(90deg);
  }
  50% {
    transform: translateY(-20px) rotateY(180deg);
  }
  75% {
    transform: translateY(-10px) rotateY(270deg);
  }
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 700;
  color: #f0f0f5;
  margin: 0;
}

.input-section {
  margin-bottom: 16px;
}

.coin-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.04);
  border: 2px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 12px 16px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 20px;
  font-weight: 700;
  color: #ffd700;
  text-align: center;
  transition: all 0.2s;
  margin-bottom: 10px;
}

.coin-input:focus {
  outline: none;
  border-color: #6c5ce7;
  background: rgba(108, 92, 231, 0.1);
}

.coin-input.error {
  border-color: rgba(255, 82, 82, 0.5);
  background: rgba(255, 82, 82, 0.05);
}

.error-message {
  color: #ff5252;
  font-size: 12px;
  margin-top: -6px;
  margin-bottom: 8px;
  text-align: center;
}

.coin-input::placeholder {
  color: #55556a;
}

/* Убираем стрелки у input type=number */
.coin-input::-webkit-outer-spin-button,
.coin-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.coin-input[type=number] {
  -moz-appearance: textfield;
}

.conversion-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.conversion-item {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 600;
  color: #c0c0d0;
}

.conversion-item.ton {
  color: #0088cc;
  font-size: 14px;
  font-weight: 700;
}

.conversion-item.rate {
  color: #a29bfe;
  font-size: 12px;
  font-weight: 500;
}

.conversion-separator {
  color: #55556a;
  font-size: 12px;
}

.payment-info {
  margin-bottom: 12px;
}

.info-block {
  margin-bottom: 12px;
}

.info-label {
  font-size: 11px;
  color: #8888a0;
  margin-bottom: 4px;
}

.info-value-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-value {
  flex: 1;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 8px 10px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: #f0f0f5;
  word-break: break-all;
}

.info-value.comment {
  color: #f0f0f5;
  font-weight: 600;
}

.copy-btn {
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #c0c0d0;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  padding: 0;
}

.copy-btn .icon {
  width: 18px;
  height: 18px;
}

.copy-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  color: #f0f0f5;
}

.copy-btn:active {
  transform: scale(0.95);
}

.copy-btn.copied {
  background: rgba(0, 230, 118, 0.15);
  border-color: rgba(0, 230, 118, 0.3);
  color: #00e676;
}

.info-box {
  background: rgba(108, 92, 231, 0.08);
  border: 1px solid rgba(108, 92, 231, 0.15);
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 12px;
}

.info-item {
  font-size: 11px;
  color: #c0c0d0;
  margin-bottom: 6px;
  line-height: 1.4;
}

.info-item:last-child {
  margin-bottom: 0;
}

.warning {
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.2);
  border-radius: 10px;
  padding: 10px;
  font-size: 12px;
  color: #ffd700;
  text-align: center;
}

</style>

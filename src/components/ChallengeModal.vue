<script setup>
import { ref, computed } from 'vue'
import { duelsApi } from '@/api/duels'

const emit = defineEmits(['close'])

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || 'DuelQBot'

const STAKES = [10, 25, 50, 100]
const CATEGORIES = [
  { label: 'Кино', value: 'cinema' },
]

const step = ref('setup') // 'setup' | 'loading' | 'invite'
const stake = ref(25)
const category = ref('cinema')
const inviteLink = ref('')
const copied = ref(false)

const categoryLabel = computed(() => {
  return CATEGORIES.find(c => c.value === category.value)?.label || category.value
})

async function createDuel() {
  step.value = 'loading'

  try {
    const { data } = await duelsApi.create({ stake: stake.value, category: category.value })
    const duel = data.duel
    inviteLink.value = duel.invite_link
    step.value = 'invite'
  } catch (e) {
    // Ошибка уже обработана в interceptor
    step.value = 'setup'
  }
}

function shareLink() {
  const tg = window.Telegram?.WebApp
  if (tg) {
    tg.openTelegramLink(
      `https://t.me/share/url?url=${encodeURIComponent(inviteLink.value)}&text=${encodeURIComponent('Принимай вызов! Сыграем в DuelQ? 🎯')}`
    )
  } else {
    copyLink()
  }
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(inviteLink.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    // fallback — выделяем текст
  }
}

function reset() {
  step.value = 'setup'
  stake.value = 25
  category.value = 'cinema'
  inviteLink.value = ''
  copied.value = false
}
</script>

<template>
  <!-- Overlay -->
  <div class="overlay" @click.self="emit('close')">
    <div class="sheet">

      <!-- ── STEP: setup ── -->
      <template v-if="step === 'setup'">
        <div class="sheet-header">
          <span class="sheet-title">Вызов друга</span>
          <button class="close-btn" @click="emit('close')">✕</button>
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

      <!-- ── STEP: invite ── -->
      <template v-else-if="step === 'invite'">
        <div class="sheet-header">
          <span class="sheet-title">Приглашение готово!</span>
          <button class="close-btn" @click="emit('close')">✕</button>
        </div>

        <div class="invite-info">
          <span>⭐ {{ stake }} Stars · {{ categoryLabel }}</span>
        </div>

        <div class="link-box" @click="copyLink">
          <span class="link-text">{{ inviteLink }}</span>
          <span class="copy-hint">{{ copied ? '✓' : '⎘' }}</span>
        </div>

        <button class="btn-primary" @click="shareLink">
          📤 Поделиться в Telegram
        </button>

        <button class="btn-ghost" @click="reset">
          ← Создать другой
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

/* Invite */
.invite-info {
  text-align: center;
  color: #ffd700;
  font-size: 14px;
  margin-bottom: 20px;
}

.link-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 12px 14px;
  margin-bottom: 20px;
  cursor: pointer;
}

.link-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #a29bfe;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.copy-hint {
  font-size: 16px;
  color: #55556a;
  flex-shrink: 0;
}
</style>

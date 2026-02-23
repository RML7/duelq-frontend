<script setup lang="ts">
import { ref } from 'vue'
import { duelsApi } from '@/api/duels'
import { useDuelStore } from '@/stores/duel'
import { CATEGORIES } from '@/types/categories'
import type { DuelCategory } from '@/api/types'

type Step = 'setup' | 'loading'

const STAKES = [10, 25, 50, 100] as const

const step = ref<Step>('setup')
const stake = ref<number>(25)
const category = ref<DuelCategory>('cinema')
const duelStore = useDuelStore()

async function createDuel(): Promise<void> {
  step.value = 'loading'

  try {
    const data = await duelsApi.create({ stake: stake.value, category: category.value })
    duelStore.openGameRoom(data.duel)
  } catch (e) {
    // Ошибка уже обработана в interceptor
    step.value = 'setup'
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
</style>

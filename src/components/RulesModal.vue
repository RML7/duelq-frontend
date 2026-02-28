<script setup>
import { defineEmits } from 'vue'

const emit = defineEmits(['close'])

function close() {
  emit('close')
}
</script>

<template>
  <div class="overlay" @click.self="close">
    <div class="sheet">
      <div class="sheet-header">
        <span class="sheet-title">Правила игры</span>
        <button class="close-btn" @click="close">✕</button>
      </div>

      <div class="rules-content">
        <!-- Как создать дуэль -->
        <section class="rule-section">
          <h3 class="rule-title">Как создать дуэль</h3>
          <p class="rule-text">
            DuelQ — это интеллектуальные дуэли один на один прямо в Telegram. 
            Вы бросаете вызов другу, выбираете категорию вопросов и ставку в Telegram Stars, 
            и сражаетесь за победу в викторине.
          </p>
          <p class="rule-text">
            Чтобы начать игру, создайте дуэль — выберите сколько хотите поставить и какая тема вам интересна. 
            Система сгенерирует специальную ссылку-приглашение, которую нужно отправить тому, с кем хотите сразиться.
          </p>
          <div class="rule-highlight">
            <span class="icon">⚠️</span>
            <span>Важный момент: пока ваша дуэль активна, создать новую нельзя — сначала нужно завершить текущую.</span>
          </div>
        </section>

        <!-- Игровой процесс -->
        <section class="rule-section">
          <h3 class="rule-title">Игровой процесс</h3>
          <p class="rule-text">
            Игра состоит из <strong>семи раундов</strong>. В каждом раунде оба игрока одновременно получают 
            один и тот же вопрос с четырьмя вариантами ответа.
          </p>
          <div class="rule-feature">
            <span class="feature-icon">⏱️</span>
            <div>
              <div class="feature-label">Время на ответ</div>
              <div class="feature-value">10 секунд</div>
            </div>
          </div>
          <p class="rule-text">
            Здесь важна не только точность, но и <strong>скорость</strong> — чем быстрее вы ответите правильно, 
            тем больше очков получите за раунд. Если ответите неправильно или не успеете — раунд проигран.
          </p>
        </section>

        <!-- Как определяется победитель -->
        <section class="rule-section">
          <h3 class="rule-title">Как определяется победитель</h3>
          <div class="rule-steps">
            <div class="rule-step">
              <span class="step-number">1</span>
              <span class="step-text">Побеждает тот, кто выиграет больше раундов из семи</span>
            </div>
            <div class="rule-step">
              <span class="step-number">2</span>
              <span class="step-text">Если количество раундов одинаковое — смотрим на сумму очков</span>
            </div>
            <div class="rule-step">
              <span class="step-number">3</span>
              <span class="step-text">Если и очки совпали — это ничья (редкий исход)</span>
            </div>
          </div>
        </section>

        <!-- Ставки и выплаты -->
        <section class="rule-section">
          <h3 class="rule-title">Ставки и выплаты</h3>
          <p class="rule-text">
            Перед началом игры оба участника платят выбранную ставку в Telegram Stars. 
            Победитель забирает весь банк, но платформа удерживает <strong>комиссию 10%</strong>.
          </p>
          <div class="rule-payout">
            <div class="payout-row">
              <span class="payout-label">Победа</span>
              <span class="payout-value win">Весь банк - 10%</span>
            </div>
            <div class="payout-row">
              <span class="payout-label">Ничья</span>
              <span class="payout-value draw">Возврат ставки</span>
            </div>
            <div class="payout-row">
              <span class="payout-label">Поражение</span>
              <span class="payout-value lose">0 ⭐</span>
            </div>
          </div>
          <p class="rule-text small">
            В случае ничьей каждый игрок получает свою ставку обратно — никто не теряет Stars.
          </p>
        </section>
      </div>
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
  max-height: 90vh;
  background: #12121a;
  border-radius: 24px 24px 0 0;
  padding: 0 20px 40px;
  animation: slideUp 0.25s ease;
  overflow-y: auto;
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
  position: sticky;
  top: 0;
  background: #12121a;
  padding: 24px 20px 16px;
  z-index: 10;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  margin-left: -20px;
  margin-right: -20px;
  width: calc(100% + 40px);
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

.rules-content {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.rule-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.rule-title {
  font-size: 16px;
  font-weight: 700;
  color: #a29bfe;
  margin: 0;
}

.rule-text {
  color: #c0c0d0;
  font-size: 14px;
  line-height: 1.6;
  margin: 0;
}

.rule-text strong {
  color: #f0f0f5;
  font-weight: 600;
}

.rule-text.small {
  font-size: 12px;
  color: #8888a0;
}

.rule-highlight {
  display: flex;
  gap: 10px;
  background: rgba(255, 193, 7, 0.08);
  border-left: 3px solid #ffd700;
  padding: 12px 14px;
  border-radius: 8px;
  font-size: 13px;
  color: #c0c0d0;
  line-height: 1.5;
}

.rule-highlight .icon {
  font-size: 18px;
  flex-shrink: 0;
}

.rule-feature {
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(108, 92, 231, 0.1);
  border: 1px solid rgba(108, 92, 231, 0.2);
  border-radius: 12px;
  padding: 14px 16px;
}

.feature-icon {
  font-size: 28px;
}

.feature-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #8888a0;
  margin-bottom: 2px;
}

.feature-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 18px;
  font-weight: 700;
  color: #a29bfe;
}

.rule-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rule-step {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
}

.step-number {
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #6c5ce7, #5a4bd1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}

.step-text {
  color: #c0c0d0;
  font-size: 14px;
  line-height: 1.5;
}

.rule-payout {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.payout-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background: #12121a;
  border-radius: 8px;
}

.payout-label {
  font-size: 13px;
  color: #8888a0;
}

.payout-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  font-weight: 600;
}

.payout-value.win {
  color: #00e676;
}

.payout-value.draw {
  color: #ffd700;
}

.payout-value.lose {
  color: #ff5252;
}
</style>

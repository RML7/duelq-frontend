<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { filterIntegerInput } from '@/utils/inputFilters'
import { TonConnectUI, type Wallet } from '@tonconnect/ui'
import { usersApi } from '@/api/users'
import { STORAGE_KEYS } from '@/constants/storage'
import { useToast } from '@/composables/useToast'
import { beginCell, Address } from '@ton/core'

const { showSuccess, showError } = useToast()

const props = defineProps<{
  balance: number
}>()

const emit = defineEmits<{
  close: []
}>()

type Tab = 'deposit' | 'withdraw'
const activeTab = ref<Tab>('deposit')

// Deposit
const depositAmount = ref<string>('100')
const coinToUsdtRate = 0.01
const minDeposit = 100
const tonWalletAddress = (import.meta.env.VITE_DEPOSIT_WALLET_ADDRESS as string) || ''
const userId = localStorage.getItem('user_id') || 'unknown'

const USDT_DECIMALS = 6                 // 1 USDT = 1_000_000 nano-USDT
const JETTON_GAS_AMOUNT = '100000000'  // 0.1 TON на газ (в нанотонах)
const TON_ADDR_TEST_ONLY = import.meta.env.VITE_TON_ADDRESS_TEST_ONLY === 'true'

const copiedAddress = ref(false)
const copiedComment = ref(false)

// TON Connect
let tonConnectUI: TonConnectUI | null = null
const connectedWallet = ref<Wallet | null>(null)
const isConnecting = ref(false)
const depositInProgress = ref(false)
const withdrawInProgress = ref(false)
const isLoadingWallet = ref(true)

const depositCoins = computed(() => parseInt(depositAmount.value) || 0)
const depositUsdt = computed(() => (depositCoins.value * coinToUsdtRate).toFixed(2))
const depositBelowMin = computed(() => depositCoins.value > 0 && depositCoins.value < minDeposit)

// Withdraw
const withdrawAmount = ref<string>('')
const withdrawAddress = ref<string>('')
const minWithdraw = 500
const withdrawCoins = computed(() => parseInt(withdrawAmount.value) || 0)
const withdrawUsdt = computed(() => (withdrawCoins.value * coinToUsdtRate).toFixed(2))
const withdrawBelowMin = computed(() => withdrawCoins.value > 0 && withdrawCoins.value < minWithdraw)
const withdrawExceedsBalance = computed(() => withdrawCoins.value > props.balance)
const withdrawAddressInvalid = computed(() => withdrawAddress.value.length > 0 && withdrawAddress.value.length < 10)
const withdrawValid = computed(() => {
  if (connectedWallet.value) {
    return withdrawCoins.value >= minWithdraw && !withdrawExceedsBalance.value
  }
  return withdrawCoins.value >= minWithdraw &&
    !withdrawExceedsBalance.value &&
    withdrawAddress.value.length >= 10
})

function setMaxWithdraw() {
  withdrawAmount.value = String(props.balance)
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

function handleClose() {
  emit('close')
}

// TON Connect initialization
onMounted(async () => {
  try {
    tonConnectUI = new TonConnectUI({
      manifestUrl: window.location.origin + '/tonconnect-manifest.json',
      actionsConfiguration: {
        twaReturnUrl: import.meta.env.VITE_TG_BOT_URL as `https://t.me/${string}`,
        returnStrategy: 'back'
      }
    })

    tonConnectUI.onStatusChange(async (wallet) => {
      connectedWallet.value = wallet
      // Первый вызов onStatusChange — TonConnect восстановил сессию, можно показывать UI
      isLoadingWallet.value = false

      if (wallet) {
        try {
          await usersApi.saveWallet(
            Address.parse(wallet.account.address).toString({
              bounceable: true,
              urlSafe: true,
              testOnly: TON_ADDR_TEST_ONLY
            })
          )
        } catch (error) {
          console.error('Failed to save wallet:', error)
        }
      } else {
        try {
          await usersApi.saveWallet(null)
        } catch (error) {
          console.error('Failed to clear wallet:', error)
        }
      }
    })

    // Страховка: если onStatusChange не стрельнул за 1000ms — кошелька нет, показываем UI
    setTimeout(() => {
      if (isLoadingWallet.value) {
        connectedWallet.value = null
        isLoadingWallet.value = false
      }
    }, 1000)

  } catch (error) {
    console.error('Failed to initialize TON Connect:', error)
    isLoadingWallet.value = false
  }

})

onUnmounted(() => {
  tonConnectUI = null
})

async function connectWallet() {
  if (!tonConnectUI) return
  isConnecting.value = true
  try {
    await tonConnectUI.openModal()
  } catch (error) {
    console.error('Failed to connect wallet:', error)
  } finally {
    isConnecting.value = false
  }
}

async function disconnectWallet() {
  if (!tonConnectUI) return
  try {
    await tonConnectUI.disconnect()
    connectedWallet.value = null
  } catch (error) {
    console.error('Failed to disconnect wallet:', error)
  }
}

const walletAddress = computed(() => {
  if (!connectedWallet.value) return ''
  const friendly = Address.parse(connectedWallet.value.account.address).toString({
    bounceable: false,
    urlSafe: true,
    testOnly: TON_ADDR_TEST_ONLY
  })
  return friendly.slice(0, 6) + '...' + friendly.slice(-6)
})

const fullWalletAddress = computed(() => {
  if (!connectedWallet.value) return ''
  return Address.parse(connectedWallet.value.account.address).toString({
    bounceable: false,
    urlSafe: true,
    testOnly: TON_ADDR_TEST_ONLY
  })
})

async function sendDepositTransaction() {
  if (!tonConnectUI || !connectedWallet.value || depositCoins.value < minDeposit) return

  depositInProgress.value = true
  try {
    if (!tonWalletAddress.trim()) {
      throw new Error('VITE_DEPOSIT_WALLET_ADDRESS is not set')
    }

    const userAddress = connectedWallet.value.account.address

    const storedUserId = localStorage.getItem(STORAGE_KEYS.USER_ID)
    if (!storedUserId) {
      throw new Error('user_id missing in localStorage')
    }

    const profile = await usersApi.getUser(storedUserId)
    const jettonWalletAddress = profile.jetton_usdt_address?.trim()
    if (!jettonWalletAddress) {
      throw new Error('jetton_usdt_address missing in user profile')
    }

    // Сумма в нано-USDT (6 знаков)
    const usdtNano = BigInt(Math.round(parseFloat(depositUsdt.value) * 10 ** USDT_DECIMALS))

    // Комментарий с userId для идентификации депозита
    const forwardPayload = beginCell()
      .storeUint(0, 32)
      .storeStringTail(userId)
      .endCell()

    // Jetton Transfer payload (op 0x0f8a7ea5)
    const payload = beginCell()
      .storeUint(0x0f8a7ea5, 32)                 // Jetton Transfer op
      .storeUint(0, 64)                           // query_id
      .storeCoins(usdtNano)                       // сумма в нано-USDT
      .storeAddress(Address.parse(tonWalletAddress))  // destination — наш кошелёк
      .storeAddress(Address.parse(userAddress))   // response_destination — вернуть лишний TON
      .storeBit(0)                                // no custom_payload
      .storeCoins(1n)                             // forward_ton_amount (минимум)
      .storeBit(1)                                // forward_payload как ref
      .storeRef(forwardPayload)
      .endCell()
      .toBoc()
      .toString('base64')

    const transaction = {
      validUntil: Math.floor(Date.now() / 1000) + 600,
      messages: [
        {
          address: jettonWalletAddress,  // на Jetton-кошелёк пользователя
          amount: JETTON_GAS_AMOUNT,     // 0.1 TON на газ
          payload
        }
      ]
    }

    await tonConnectUI.sendTransaction(transaction)
    showSuccess('Транзакция отправлена! Средства будут зачислены в течение ~10 минут')
  } catch (error) {
    console.error('[WalletModal] sendDepositTransaction:', error)
    showError('Ошибка при отправке транзакции')
  } finally {
    depositInProgress.value = false
  }
}

async function sendWithdrawRequest() {
  if (!withdrawValid.value) return
  
  withdrawInProgress.value = true
  try {
    const targetAddress = connectedWallet.value ? fullWalletAddress.value : withdrawAddress.value
    
    console.log('Withdraw request:', {
      amount: withdrawCoins.value,
      address: targetAddress,
      userId: userId
    })
    
    showSuccess('Запрос на вывод отправлен! Средства будут переведены в течение 24 часов')
  } catch (error) {
    console.error('Withdraw failed:', error)
    showError('Ошибка при выводе средств')
  } finally {
    withdrawInProgress.value = false
  }
}
</script>

<template>
  <div class="modal-overlay" @click="handleClose">
    <div class="modal-sheet" @click.stop>
      <div class="sheet-handle"></div>

      <!-- Balance header -->
      <div class="wallet-header">
        <img src="@/assets/icons/coin.png" alt="coin" class="header-coin" />
        <div class="header-info">
          <div class="header-label">Ваш баланс</div>
          <div class="header-balance">{{ balance.toLocaleString() }} <span class="header-currency">Coins</span></div>
          <div class="header-rate">1 USDT = 100 coins</div>
        </div>
        <button class="close-btn" @click="handleClose">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- TON Connect Section (общая для обеих вкладок) -->
      <div class="wallet-connect-section">
        <div v-if="isLoadingWallet" class="wallet-loading">
          <div class="loading-spinner"></div>
          <div class="loading-text">Проверка кошелька...</div>
        </div>
        <div v-else-if="!connectedWallet" class="connect-prompt">
          <div class="connect-icon">🔗</div>
          <div class="connect-text">
            <div class="connect-title">Подключите TON кошелек</div>
            <div class="connect-subtitle">Для быстрых операций через приложение</div>
          </div>
          <button class="connect-btn" @click="connectWallet" :disabled="isConnecting">
            {{ isConnecting ? 'Подключение...' : 'Подключить' }}
          </button>
        </div>
        <div v-else class="wallet-connected">
          <div class="wallet-info">
            <div class="wallet-icon">✓</div>
            <div class="wallet-details">
              <div class="wallet-label">Подключен кошелек</div>
              <div class="wallet-addr">{{ walletAddress }}</div>
            </div>
          </div>
          <button class="disconnect-btn" @click="disconnectWallet">Отключить</button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button
          class="tab"
          :class="{ active: activeTab === 'deposit' }"
          @click="activeTab = 'deposit'"
        >
          <span class="tab-icon">&#8599;</span> Пополнить
        </button>
        <button
          class="tab"
          :class="{ active: activeTab === 'withdraw' }"
          @click="activeTab = 'withdraw'"
        >
          <span class="tab-icon">&#8600;</span> Вывести
        </button>
      </div>

      <!-- Deposit tab -->
      <div v-if="activeTab === 'deposit'" class="tab-content">
        <div class="amount-section">
          <div class="amount-row">
            <div class="amount-input-wrap" :class="{ error: depositBelowMin }">
              <input
                v-model="depositAmount"
                type="text"
                inputmode="numeric"
                @input="e => depositAmount = filterIntegerInput(e)"
                class="amount-input"
                placeholder="100"
              />
              <span class="amount-unit">монет</span>
            </div>
            <div class="amount-result">
              <div class="result-value">{{ depositUsdt }} <span class="result-currency">USDT</span></div>
            </div>
          </div>
          <div v-if="depositBelowMin" class="field-error">Минимум {{ minDeposit }} монет</div>
        </div>

        <!-- Payment method based on wallet connection -->
        <div v-if="connectedWallet" class="connected-payment">
          <button 
            class="action-btn" 
            :disabled="depositBelowMin || depositInProgress"
            @click="sendDepositTransaction"
          >
            {{ depositInProgress ? 'Отправка...' : `Пополнить ${depositCoins > 0 ? depositCoins.toLocaleString() + ' монет' : ''}` }}
          </button>
          <div class="info-box">
            <div class="info-item">💰 Минимальная сумма <span class="accent">{{ minDeposit }} монет ({{ (minDeposit * coinToUsdtRate).toFixed(2) }} USDT)</span></div>
            <div class="info-item">⏱ Время зачисления: <span class="accent">~10 минут</span></div>
          </div>
        </div>

        <div v-else class="manual-payment">
          <div class="payment-steps">
          <div class="step">
            <div class="step-body">
              <div class="step-label">Адрес для перевода:</div>
              <div class="copy-row">
                <div class="copy-value">{{ tonWalletAddress }}</div>
                <button class="copy-btn" :class="{ copied: copiedAddress }" @click="copyToClipboard(tonWalletAddress, 'address')">
                  <svg v-if="!copiedAddress" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div class="step">
            <div class="step-body">
              <div class="step-label">Комментарий <span class="label-accent">(обязательно!)</span></div>
              <div class="copy-row">
                <div class="copy-value highlight">{{ userId }}</div>
                <button class="copy-btn" :class="{ copied: copiedComment }" @click="copyToClipboard(userId, 'comment')">
                  <svg v-if="!copiedComment" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

          <div class="info-box">
            <div class="info-item">💰 Минимальная сумма <span class="accent">{{ minDeposit }} монет ({{ (minDeposit * coinToUsdtRate).toFixed(2) }} USDT)</span> — иначе перевод <span class="accent">не будет зачислен</span></div>
            <div class="info-item">💳 Принимаются только <span class="accent">USDT в сети TON</span></div>
            <div class="info-item">⚠️ Обязательно укажите <span class="accent">комментарий</span>, иначе перевод <span class="accent">не будет зачислен</span></div>
            <div class="info-item">⏱ Время зачисления: <span class="accent">~10 минут</span></div>
          </div>
        </div>
      </div>

      <!-- Withdraw tab -->
      <div v-else class="tab-content">
        <div class="amount-section">
          <div class="amount-label">
            Количество монет
            <button class="max-btn" @click="setMaxWithdraw">MAX</button>
          </div>
          <div class="amount-row">
            <div class="amount-input-wrap" :class="{ error: withdrawBelowMin || withdrawExceedsBalance }">
              <input
                v-model="withdrawAmount"
                type="text"
                inputmode="numeric"
                @input="e => withdrawAmount = filterIntegerInput(e)"
                class="amount-input"
                :placeholder="String(minWithdraw)"
              />
              <span class="amount-unit">монет</span>
            </div>
            <div class="amount-result">
              <div class="result-value">{{ withdrawUsdt }} <span class="result-currency">USDT</span></div>
            </div>
          </div>
          <div v-if="withdrawExceedsBalance" class="field-error">Недостаточно монет на балансе</div>
          <div v-else-if="withdrawBelowMin" class="field-error">Минимум {{ minWithdraw }} монет</div>
        </div>

        <!-- Withdraw address field (only if wallet not connected) -->
        <div v-if="!connectedWallet" class="field-group">
          <div class="field-label">Ваш TON-адрес для вывода</div>
          <input
            v-model="withdrawAddress"
            type="text"
            class="text-input"
            :class="{ error: withdrawAddressInvalid }"
            placeholder="0Q..."
          />
          <div v-if="withdrawAddressInvalid" class="field-error">Введите корректный TON-адрес</div>
        </div>

        <button 
          class="action-btn" 
          :disabled="!withdrawValid || withdrawInProgress"
          @click="sendWithdrawRequest"
        >
          {{ withdrawInProgress ? 'Отправка...' : `Вывести ${withdrawCoins > 0 ? withdrawCoins.toLocaleString() + ' монет' : ''}` }}
        </button>

        <div v-if="connectedWallet" class="info-box">
          <div class="info-item">💰 Минимальная сумма <span class="accent">{{ minWithdraw }} монет</span></div>
          <div class="info-item">⏱ Вывод на адрес: <span class="accent">{{ walletAddress }}</span></div>
          <div class="info-item">⏱ Время обработки: <span class="accent">до 24 часов</span></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  animation: overlayIn 0.2s ease-out;
}

@keyframes overlayIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-sheet {
  background: #13131c;
  border-radius: 24px 24px 0 0;
  border-top: 1px solid rgba(255,255,255,0.08);
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 0 0 40px;
  animation: sheetUp 0.35s cubic-bezier(0.32, 0.72, 0, 1);
}

@keyframes sheetUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.sheet-handle {
  width: 40px;
  height: 4px;
  background: rgba(255,255,255,0.15);
  border-radius: 2px;
  margin: 12px auto 0;
}

/* Header */
.wallet-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px 12px;
}

.header-coin {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  animation: coinSpin 0.8s ease-out;
}

@keyframes coinSpin {
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

.header-info {
  flex: 1;
}

.header-label {
  font-size: 11px;
  color: #666680;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.header-balance {
  font-family: 'JetBrains Mono', monospace;
  font-size: 26px;
  font-weight: 700;
  color: #ffd700;
  line-height: 1.2;
}

.header-currency {
  font-size: 14px;
  color: #ffd700;
}

.header-rate {
  font-size: 10px;
  color: #666680;
  margin-top: 2px;
}

.close-btn {
  background: rgba(255,255,255,0.06);
  border: none;
  color: #666680;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
  padding: 0;
}

.close-btn svg { width: 16px; height: 16px; }
.close-btn:hover { background: rgba(255,255,255,0.1); color: #f0f0f5; }

/* Tabs */
.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 4px 20px 0;
  margin-bottom: 4px;
}

.tab {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  padding: 11px 8px;
  font-size: 14px;
  font-weight: 600;
  color: #666680;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.tab-icon {
  font-size: 16px;
  line-height: 1;
}

.tab.active {
  background: rgba(108,92,231,0.15);
  border-color: rgba(108,92,231,0.4);
  color: #a29bfe;
}

.tab:hover:not(.active) {
  background: rgba(255,255,255,0.07);
  color: #c0c0d0;
}

/* Tab content */
.tab-content {
  padding: 16px 20px 0;
}

/* Amount section */
.amount-section {
  margin-bottom: 12px;
}

.amount-label {
  font-size: 12px;
  color: #666680;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.max-btn {
  background: rgba(108,92,231,0.15);
  border: 1px solid rgba(108,92,231,0.3);
  color: #a29bfe;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  cursor: pointer;
  letter-spacing: 0.5px;
  transition: all 0.15s;
}

.max-btn:hover {
  background: rgba(108,92,231,0.25);
}

.amount-row {
  display: flex;
  align-items: stretch;
  gap: 10px;
}

.amount-input-wrap {
  display: flex;
  align-items: center;
  background: rgba(255,255,255,0.04);
  border: 1.5px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 0 12px;
  transition: border-color 0.2s;
  flex: 1;
}

.amount-input-wrap:focus-within {
  border-color: rgba(108,92,231,0.5);
  background: rgba(108,92,231,0.06);
}

.amount-input-wrap.error {
  border-color: rgba(255,82,82,0.4);
  background: rgba(255,82,82,0.04);
}

.amount-input {
  flex: 1;
  background: transparent;
  border: none;
  font-family: 'JetBrains Mono', monospace;
  font-size: 18px;
  font-weight: 700;
  color: #ffd700;
  padding: 10px 0;
  outline: none;
  width: 0;
  min-width: 0;
}

.amount-input::placeholder { color: #3a3a50; }
.amount-input::-webkit-outer-spin-button,
.amount-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.amount-input[type=number] { -moz-appearance: textfield; }

.amount-unit {
  font-size: 12px;
  color: #555570;
  margin-left: 6px;
  white-space: nowrap;
}

.amount-result {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  background: rgba(255,255,255,0.03);
  border: 1.5px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  padding: 8px 12px;
  min-width: 90px;
}

.result-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 15px;
  font-weight: 700;
  color: #f0f0f5;
  white-space: nowrap;
}

.result-currency {
  font-size: 11px;
  font-weight: 500;
  color: #8888a0;
}

.result-rate {
  font-size: 10px;
  color: #555570;
  margin-top: 2px;
  white-space: nowrap;
}

.field-error {
  font-size: 11px;
  color: #ff5252;
  margin-top: 5px;
  margin-left: 0;
  padding-left: 0;
  text-align: left;
}

/* Quick amounts */
.quick-amounts {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.quick-btn {
  flex: 1;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 10px;
  padding: 8px 4px;
  font-size: 13px;
  font-weight: 600;
  color: #8888a0;
  cursor: pointer;
  transition: all 0.15s;
}

.quick-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.08);
  color: #c0c0d0;
}

.quick-btn.active {
  background: rgba(108,92,231,0.15);
  border-color: rgba(108,92,231,0.4);
  color: #a29bfe;
}

.quick-btn.disabled,
.quick-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

/* Divider */
.divider {
  height: 1px;
  background: rgba(255,255,255,0.06);
  margin-bottom: 16px;
}

/* Steps */
.payment-steps {
  margin-bottom: 16px;
}

.step {
  margin-bottom: 14px;
}

.step:last-child {
  margin-bottom: 0;
}

.step-body { min-width: 0; }

.step-label {
  font-size: 11px;
  color: #666680;
  margin-bottom: 5px;
}

.copy-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.copy-value {
  flex: 1;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 8px;
  padding: 7px 10px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: #c0c0d0;
  word-break: break-all;
  line-height: 1.4;
}

.copy-value.highlight {
  color: #c0c0d0;
  font-weight: 600;
  font-size: 13px;
}

.copy-btn {
  flex-shrink: 0;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  color: #8888a0;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  padding: 0;
}

.copy-btn svg { width: 16px; height: 16px; }
.copy-btn:hover { background: rgba(255,255,255,0.09); color: #f0f0f5; }
.copy-btn.copied { background: rgba(0,230,118,0.12); border-color: rgba(0,230,118,0.3); color: #00e676; }

/* Withdraw text input */
.field-group {
  margin-bottom: 16px;
}

.field-label {
  font-size: 12px;
  color: #666680;
  margin-bottom: 6px;
}

.text-input {
  width: 100%;
  background: rgba(255,255,255,0.04);
  border: 1.5px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 12px 14px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  color: #f0f0f5;
  outline: none;
  transition: border-color 0.2s;
}

.text-input:focus { border-color: rgba(108,92,231,0.5); background: rgba(108,92,231,0.06); }
.text-input.error { border-color: rgba(255,82,82,0.4); }
.text-input::placeholder { color: #3a3a50; }

/* Action button */
.action-btn {
  width: 100%;
  background: linear-gradient(135deg, #6c5ce7, #5a4bd1);
  border: none;
  border-radius: 14px;
  padding: 16px;
  font-size: 15px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  margin-bottom: 14px;
  transition: all 0.2s;
  box-shadow: 0 4px 16px rgba(108,92,231,0.3);
}

.action-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #7c6cf7, #6c5ce7);
  box-shadow: 0 6px 20px rgba(108,92,231,0.45);
  transform: translateY(-1px);
}

.action-btn:active:not(:disabled) { transform: translateY(0); }

.action-btn:disabled {
  background: rgba(255,255,255,0.07);
  color: #44445a;
  box-shadow: none;
  cursor: default;
}

.info-box {
  background: rgba(108,92,231,0.08);
  border: 1px solid rgba(108,92,231,0.15);
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 12px;
  text-align: left;
}

.info-item {
  font-size: 11px;
  color: #c0c0d0;
  margin-bottom: 6px;
  line-height: 1.4;
  text-align: left;
}

.info-item:last-child {
  margin-bottom: 0;
}

.warning {
  background: rgba(255,193,7,0.08);
  border: 1px solid rgba(255,193,7,0.18);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 12px;
  color: #c0c0d0;
  line-height: 1.5;
  text-align: left;
}

/* Notice (withdraw) */
.notice {
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 11px;
  line-height: 1.5;
  background: rgba(108,92,231,0.07);
  border: 1px solid rgba(108,92,231,0.15);
  color: #7070a0;
}

.accent { color: #a29bfe; font-weight: 600; }
.label-accent { color: #8888a0; }

/* TON Connect styles */
.wallet-connect-section {
  padding: 0 20px;
  margin-bottom: 12px;
}

.wallet-loading {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 12px;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(108,92,231,0.2);
  border-top-color: #6c5ce7;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 13px;
  color: #8888a0;
}

.connect-prompt {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(108,92,231,0.08);
  border: 1px solid rgba(108,92,231,0.2);
  border-radius: 12px;
  padding: 12px;
}

.connect-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.connect-text {
  flex: 1;
  min-width: 0;
}

.connect-title {
  font-size: 13px;
  font-weight: 600;
  color: #f0f0f5;
  margin-bottom: 2px;
}

.connect-subtitle {
  font-size: 11px;
  color: #8888a0;
}

.connect-btn {
  background: linear-gradient(135deg, #6c5ce7, #5a4bd1);
  border: none;
  border-radius: 10px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.connect-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #7c6cf7, #6c5ce7);
  transform: translateY(-1px);
}

.connect-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.wallet-connected {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: rgba(0,230,118,0.08);
  border: 1px solid rgba(0,230,118,0.2);
  border-radius: 12px;
  padding: 12px;
}

.wallet-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.wallet-icon {
  width: 32px;
  height: 32px;
  background: rgba(0,230,118,0.15);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #00e676;
  flex-shrink: 0;
}

.wallet-details {
  flex: 1;
  min-width: 0;
}

.wallet-label {
  font-size: 11px;
  color: #8888a0;
  margin-bottom: 2px;
}

.wallet-addr {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 600;
  color: #00e676;
}

.disconnect-btn {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  color: #8888a0;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.disconnect-btn:hover {
  background: rgba(255,82,82,0.1);
  border-color: rgba(255,82,82,0.3);
  color: #ff5252;
}

.connected-payment,
.manual-payment {
  width: 100%;
}
</style>

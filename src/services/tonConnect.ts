import { TonConnectUI } from '@tonconnect/ui'
import { ref } from 'vue'
import type { Wallet } from '@tonconnect/ui'

const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`

export const tonConnectUI = new TonConnectUI({ manifestUrl })

export const connectedWallet = ref<Wallet | null>(tonConnectUI.wallet)

tonConnectUI.onStatusChange(wallet => {
  connectedWallet.value = wallet
})

export function getWalletAddress(): string | null {
  return connectedWallet.value?.account.address ?? null
}
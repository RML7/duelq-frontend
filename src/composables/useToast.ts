import { ref, Ref } from 'vue'

export type ToastType = 'error' | 'success'

export interface Toast {
  id: number
  message: string
  type: ToastType
}

const toasts: Ref<Toast[]> = ref([])
let idCounter = 0

export function useToast() {
  function showToast(message: string, type: ToastType = 'error', duration: number = 4000): void {
    const id = ++idCounter
    toasts.value.push({ id, message, type })

    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id)
    }, duration)
  }

  function showError(message: string): void {
    showToast(message, 'error')
  }

  function showSuccess(message: string): void {
    showToast(message, 'success')
  }

  function removeToast(id: number): void {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  return {
    toasts,
    showToast,
    showError,
    showSuccess,
    removeToast,
  }
}

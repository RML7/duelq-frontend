import { ref } from 'vue'

const toasts = ref([])
let idCounter = 0

export function useToast() {
  function showToast(message, type = 'error', duration = 4000) {
    const id = ++idCounter
    toasts.value.push({ id, message, type })

    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id)
    }, duration)
  }

  function showError(message) {
    showToast(message, 'error')
  }

  function showSuccess(message) {
    showToast(message, 'success')
  }

  function removeToast(id) {
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

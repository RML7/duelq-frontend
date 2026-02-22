import { ref, onUnmounted } from 'vue'

const WS_ENV_URL = import.meta.env.VITE_WS_URL
const WS_URL = WS_ENV_URL
  ? `${window.location.origin.replace(/^https:/, 'wss:')}${WS_ENV_URL}`.replace(/\/$/, '')
  : null

// Message types (должны совпадать с бэкендом)
export const MessageType = {
  AUTH: 'auth',
  PING: 'ping',
  PONG: 'pong',
  ERROR: 'error',
  OPPONENT_JOINED: 'opponent_joined',
  GAME_READY: 'game_ready',
  QUESTION: 'question',
  ANSWER: 'answer',
  OPPONENT_ANSWERED: 'opponent_answered',
  ROUND_RESULT: 'round_result',
  GAME_FINISHED: 'game_finished',
}

export function useWebSocket() {
  const ws = ref(null)
  const connected = ref(false)
  const messageHandlers = new Map()

  /**
   * Подключиться к WebSocket для дуэли
   * @param {string} duelId - ID дуэли
   * @param {string} token - JWT токен
   */
  function connect(duelId, token) {
    if (!WS_URL) {
      console.error('WebSocket URL is not configured')
      return
    }

    if (ws.value) {
      console.warn('WebSocket already connected')
      return
    }

    const url = `${WS_URL}/duels/${duelId}/ws`
    console.log('Connecting to WebSocket:', url)

    ws.value = new WebSocket(url)

    ws.value.onopen = () => {
      console.log('✅ WebSocket connected')
      connected.value = true

      // Отправляем auth сообщение
      send({
        type: MessageType.AUTH,
        data: { token },
      })
    }

    ws.value.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        console.log('📩 Received message:', message)

        // Вызываем обработчик для этого типа сообщения
        const handler = messageHandlers.get(message.type)
        if (handler) {
          handler(message.data)
        } else {
          console.warn('No handler for message type:', message.type)
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    ws.value.onerror = (error) => {
      console.error('❌ WebSocket error:', error)
    }

    ws.value.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason)
      connected.value = false
      ws.value = null

      // Если закрытие не нормальное — можно попробовать переподключиться
      if (event.code !== 1000 && event.code !== 1001) {
        console.log('Unexpected close, consider reconnecting...')
      }
    }
  }

  /**
   * Отправить сообщение через WebSocket
   * @param {Object} message - Сообщение с полями type и data
   */
  function send(message) {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(message))
    } else {
      console.error('WebSocket is not connected')
    }
  }

  /**
   * Зарегистрировать обработчик для типа сообщения
   * @param {string} type - Тип сообщения
   * @param {Function} handler - Функция-обработчик
   */
  function onMessage(type, handler) {
    messageHandlers.set(type, handler)
  }

  /**
   * Удалить обработчик для типа сообщения
   * @param {string} type - Тип сообщения
   */
  function offMessage(type) {
    messageHandlers.delete(type)
  }

  /**
   * Закрыть WebSocket соединение
   */
  function disconnect() {
    if (ws.value) {
      ws.value.close(1000, 'Client disconnect')
      ws.value = null
      connected.value = false
      messageHandlers.clear()
    }
  }

  /**
   * Отправить ping (heartbeat)
   */
  function ping() {
    send({ type: MessageType.PING })
  }

  // Автоматически закрываем соединение при размонтировании
  onUnmounted(() => {
    disconnect()
  })

  return {
    ws,
    connected,
    connect,
    disconnect,
    send,
    onMessage,
    offMessage,
    ping,
  }
}

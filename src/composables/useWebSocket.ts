import { ref, onUnmounted, Ref } from 'vue'

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
} as const

export type MessageTypeValue = typeof MessageType[keyof typeof MessageType]

export interface WebSocketMessage<T = any> {
  type: MessageTypeValue
  data?: T
}

type MessageHandler<T = any> = (data: T) => void

export function useWebSocket() {
  const ws: Ref<WebSocket | null> = ref(null)
  const connected = ref(false)
  const messageHandlers = new Map<MessageTypeValue, MessageHandler>()

  /**
   * Подключиться к WebSocket для дуэли
   */
  function connect(duelId: string, token: string): void {
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

    ws.value.onmessage = (event: MessageEvent) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data)
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

    ws.value.onerror = (error: Event) => {
      console.error('❌ WebSocket error:', error)
    }

    ws.value.onclose = (event: CloseEvent) => {
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
   */
  function send<T = any>(message: WebSocketMessage<T>): void {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(message))
    } else {
      console.error('WebSocket is not connected')
    }
  }

  /**
   * Зарегистрировать обработчик для типа сообщения
   */
  function onMessage<T = any>(type: MessageTypeValue, handler: MessageHandler<T>): void {
    messageHandlers.set(type, handler)
  }

  /**
   * Удалить обработчик для типа сообщения
   */
  function offMessage(type: MessageTypeValue): void {
    messageHandlers.delete(type)
  }

  /**
   * Закрыть WebSocket соединение
   */
  function disconnect(): void {
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
  function ping(): void {
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

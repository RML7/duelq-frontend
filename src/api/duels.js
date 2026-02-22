import client from './client'

/**
 * @typedef {Object} DuelResponse
 * @property {string} id
 * @property {string} invite_token
 * @property {string} invite_link
 * @property {number} stake
 * @property {string} category
 * @property {string} status
 * @property {string} creator_id
 * @property {string} [opponent_id]
 * @property {string} created_at
 */

/**
 * @typedef {Object} CreateDuelResponse
 * @property {DuelResponse} duel
 */

/**
 * @typedef {Object} ListDuelsResponse
 * @property {DuelResponse[]} duels
 * @property {number} count
 */

export const duelsApi = {
  /**
   * Создать новую дуэль
   * @param {Object} payload
   * @param {number} payload.stake - ставка в Stars
   * @param {string} payload.category - категория вопросов
   * @returns {Promise<{data: CreateDuelResponse}>}
   */
  async create(payload) {
    return await client.post('/duels/', payload)
  },

  /**
   * Получить список дуэлей пользователя
   * @param {Object} payload
   * @param {Object} payload.page - пагинация (limit, offset)
   * @param {string[]} [payload.status] - фильтр по статусам
   * @returns {Promise<{data: ListDuelsResponse}>}
   */
  async list(payload) {
    return await client.post('/duels/list', payload)
  },
}

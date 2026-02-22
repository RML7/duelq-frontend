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
}

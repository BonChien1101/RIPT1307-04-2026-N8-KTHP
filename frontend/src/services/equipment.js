/**
 * Equipment Service
 * Handles all equipment-related API calls
 */

import { authService } from './auth';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${authService.getToken()}`,
});

export const equipmentService = {
  /**
   * Get all equipment
   * @param {Object} params - Query parameters (page, limit, search, etc.)
   * @returns {Promise}
   */
  getAll: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? `${API_URL}/equipment?${queryString}` : `${API_URL}/equipment`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch equipment');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get equipment by ID
   * @param {number} id - Equipment ID
   * @returns {Promise}
   */
  getById: async (id) => {
    try {
      const response = await fetch(`${API_URL}/equipment/${id}`, {
        method: 'GET',
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch equipment');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create new equipment
   * @param {Object} data - Equipment data
   * @returns {Promise}
   */
  create: async (data) => {
    try {
      const response = await fetch(`${API_URL}/equipment`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create equipment');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update equipment
   * @param {number} id - Equipment ID
   * @param {Object} data - Updated equipment data
   * @returns {Promise}
   */
  update: async (id, data) => {
    try {
      const response = await fetch(`${API_URL}/equipment/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update equipment');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete equipment
   * @param {number} id - Equipment ID
   * @returns {Promise}
   */
  delete: async (id) => {
    try {
      const response = await fetch(`${API_URL}/equipment/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to delete equipment');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get equipment statistics
   * @returns {Promise}
   */
  getStatistics: async () => {
    try {
      const response = await fetch(`${API_URL}/equipment/statistics`, {
        method: 'GET',
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },
};

export default equipmentService;

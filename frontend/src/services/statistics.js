/**
 * Statistics Service
 * Handles all statistics-related API calls
 */

import { authService } from './auth';

const API_URL = `${process.env.API_URL}/api`;

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${authService.getToken()}`,
});

export const statisticsService = {
  /**
   * Get overall statistics
   * @returns {Promise}
   */
  getOverview: async () => {
    try {
      const response = await fetch(`${API_URL}/statistics/overview`, {
        method: 'GET',
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch statistics overview');
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
  getEquipmentStats: async () => {
    try {
      const response = await fetch(`${API_URL}/statistics/equipment`, {
        method: 'GET',
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch equipment statistics');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get borrow statistics
   * @returns {Promise}
   */
  getBorrowStats: async () => {
    try {
      const response = await fetch(`${API_URL}/statistics/borrow`, {
        method: 'GET',
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch borrow statistics');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get user statistics
   * @returns {Promise}
   */
  getUserStats: async () => {
    try {
      const response = await fetch(`${API_URL}/statistics/users`, {
        method: 'GET',
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user statistics');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get statistics by date range
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise}
   */
  getStatsByDateRange: async (startDate, endDate) => {
    try {
      const response = await fetch(
        `${API_URL}/statistics/range?startDate=${startDate}&endDate=${endDate}`,
        {
          method: 'GET',
          headers: getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch statistics by date range');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get most borrowed equipment
   * @param {number} limit - Number of items to return
   * @returns {Promise}
   */
  getMostBorrowedEquipment: async (limit = 10) => {
    try {
      const response = await fetch(`${API_URL}/statistics/top-equipment?limit=${limit}`, {
        method: 'GET',
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch top borrowed equipment');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get borrowing trends
   * @param {string} period - Period (day, week, month, year)
   * @returns {Promise}
   */
  getBorrowingTrends: async (period = 'month') => {
    try {
      const response = await fetch(`${API_URL}/statistics/trends?period=${period}`, {
        method: 'GET',
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch borrowing trends');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },
};

export default statisticsService;

/**
 * Borrow Service
 * Handles all borrow request-related API calls
 */

import { authService } from './auth';
import { getApiUrl } from '../utils/api';

const API_URL = getApiUrl();

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${authService.getToken()}`,
});

export const borrowService = {
  /**
   * Get all borrow requests
   * @param {Object} params - Query parameters (page, limit, status, etc.)
   * @returns {Promise}
   */
  getAllRequests: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? `${API_URL}/borrow/requests?${queryString}` : `${API_URL}/borrow/requests`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch borrow requests');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get borrow request by ID
   * @param {number} id - Request ID
   * @returns {Promise}
   */
  getRequestById: async (id) => {
    try {
      const response = await fetch(`${API_URL}/borrow/requests/${id}`, {
        method: 'GET',
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch borrow request');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create new borrow request
   * @param {Object} data - Borrow request data
   * @returns {Promise}
   */
  createRequest: async (data) => {
    try {
      const response = await fetch(`${API_URL}/borrow/request`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create borrow request');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  /**
   * Approve borrow request
   * @param {number} id - Request ID
   * @returns {Promise}
   */
  approveRequest: async (id) => {
    try {
      const response = await fetch(`${API_URL}/borrow/${id}/approve`, {
        method: 'PUT',
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to approve borrow request');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  /**
   * Reject borrow request
   * @param {number} id - Request ID
   * @returns {Promise}
   */
  rejectRequest: async (id) => {
    try {
      const response = await fetch(`${API_URL}/borrow/${id}/reject`, {
        method: 'PUT',
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to reject borrow request');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  /**
   * Return borrowed item
   * @param {number} id - Request ID
   * @returns {Promise}
   */
  returnItem: async (id) => {
    try {
      const response = await fetch(`${API_URL}/borrow/${id}/return`, {
        method: 'PUT',
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to return item');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get borrow history
   * @param {Object} params - Query parameters
   * @returns {Promise}
   */
  getHistory: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? `${API_URL}/borrow/history?${queryString}` : `${API_URL}/borrow/history`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch borrow history');
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
  getStatistics: async () => {
    try {
      const response = await fetch(`${API_URL}/borrow/statistics`, {
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

  /**
   * Delete borrow request
   * @param {number} id - Request ID
   * @returns {Promise}
   */
  deleteRequest: async (id) => {
    try {
      const response = await fetch(`${API_URL}/borrow/requests/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to delete borrow request');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },
};

export default borrowService;

import { authService } from './auth';
import { getApiUrl } from '../utils/api';

const API_URL = getApiUrl();

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${authService.getToken()}`,
});

export const borrowService = {
  getAllRequests: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `${API_URL}/borrow-requests?${queryString}` : `${API_URL}/borrow-requests`;
      
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

  getRequestById: async (id) => {
    try {
  const response = await fetch(`${API_URL}/borrow-requests/${id}`, {
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

  createRequest: async (data) => {
    try {
  const response = await fetch(`${API_URL}/borrow-requests`, {
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

  approveRequest: async (id) => {
    try {
      const response = await fetch(`${API_URL}/borrow-requests/${id}/approve`, {
        method: 'PATCH',
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

  rejectRequest: async (id) => {
    try {
      const response = await fetch(`${API_URL}/borrow-requests/${id}/reject`, {
        method: 'PATCH',
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

  markBorrowed: async (id) => {
    try {
      const response = await fetch(`${API_URL}/borrow-requests/${id}/mark-borrowed`, {
        method: 'PATCH',
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to mark as borrowed');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  markReturned: async (id) => {
    try {
      const response = await fetch(`${API_URL}/borrow-requests/${id}/mark-returned`, {
        method: 'PATCH',
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to mark as returned');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },

  getHistory: async (params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `${API_URL}/borrow-requests/me?${queryString}` : `${API_URL}/borrow-requests/me`;
      
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

  getStatistics: async () => {
    try {
  const response = await fetch(`${API_URL}/statistics/borrow`, {
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

  deleteRequest: async (id) => {
    try {
  const response = await fetch(`${API_URL}/borrow-requests/${id}`, {
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

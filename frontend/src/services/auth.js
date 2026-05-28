/**
 * Authentication Service
 * Handles all authentication-related API calls
 */
import { getApiUrl } from '../utils/api';

const API_URL = getApiUrl();

export const authService = {
  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise} - User data and token
   */
  login: async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Logout user
   */
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  /**
   * Get current user from localStorage
   * @returns {Object|null} - Current user data
   */
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    if (!user || user === 'undefined' || user === 'null') return null;
    try {
      return JSON.parse(user);
    } catch (error) {
      localStorage.removeItem('user');
      return null;
    }
  },

  /**
   * Get stored token
   * @returns {string|null} - Auth token
   */
  getToken: () => {
    return localStorage.getItem('token');
  },

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  /**
   * Refresh token
   * @returns {Promise}
   */
  refreshToken: async () => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      return data;
    } catch (error) {
      authService.logout();
      throw error;
    }
  },

  /**
   * Register new user
   * @param {Object} userData - User registration data
   * @returns {Promise}
   */
  register: async (userData) => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  },
};

export default authService;

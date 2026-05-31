import React from 'react';
import 'antd/dist/antd.css';

export async function getInitialState() {
  try {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr && userStr !== 'undefined' && userStr !== 'null') {
      const user = JSON.parse(userStr);
      if (user && typeof user === 'object') {
        return { user, token };
      }
    }
  } catch (error) {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    console.error('getInitialState error:', error);
  }
  return undefined;
}
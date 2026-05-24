import React from 'react';
import 'antd/dist/antd.css';

export async function getInitialState() {
  try {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    
    if (token && userStr) {
      const user = JSON.parse(userStr);
      return { user, token };
    }
  } catch (error) {
    console.error('getInitialState error:', error);
  }
  return undefined;
}